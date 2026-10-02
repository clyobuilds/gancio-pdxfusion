import { beforeEach, describe, expect, it, vi } from 'vitest'
import emitter from '../../server/lib/emitter'
import path from 'node:path'
import { PluginController } from '../../server/services/plugins'

const MOCK_SETTINGS = {
  enable: false,
  settings_option_1: 'aaaaa'
}

vi.mock('/plugins/example', () => ({ default: () => ({
  manifest: { name: 'test' },
  load: vi.fn()
}) }))
vi.mock('/plugins/example_enabled', () => ({ default: () => ({
  manifest: { name: 'test_enabled' },
  settings: { enable: true },
  load: vi.fn(),
  unload: vi.fn()
}) }))
vi.mock('/plugins/example3', () => ({ default: () => ({
  manifest: { name: 'test_3' },
  load: vi.fn(),
  onTest: vi.fn()
}) }))
vi.mock('/plugins/example-event-listeners', () => ({ default: () => ({
  manifest: { name: 'Test event listeners' },
  settings: MOCK_SETTINGS,
  load: vi.fn(),
  onEventCreate() {
    return this.settings
  },
  onEventUpdate() {
    return this.settings
  },
  onEventDelete() {
    return this.settings
  }
}) }))

// await connect()

describe('Plugin', () => {
  let pluginController: PluginController

  beforeEach(() => {
    const _pluginController = new PluginController()

    // Mock access to the databse, and get settings directly from the mocked plugin objects
    vi.spyOn(_pluginController, 'getSettings').mockImplementation(plugin => plugin.settings)
    vi.spyOn(_pluginController, 'setSettings').mockImplementation(
      (plugin, newSettings) => new Promise((resolve) => {
        plugin.settings = newSettings
        resolve()
      })
    )

    pluginController = _pluginController

    return () => _pluginController.destroy()
  })

  it('should not load an unknown plugin', async () => {
    const plugin = pluginController.initPlugin('./plugins/nonexistent.js')
    await expect(plugin).rejects.toThrow()
  })

  it('should load a plugin', async () => {
    const plugin = await pluginController.initPlugin(path.resolve(__dirname, './plugins/base'))
    expect(plugin?.manifest.name).toBe('base')
  })

  it('should not load a plugin twice', async () => {
    const plugin1 = pluginController.initPlugin(path.resolve(__dirname, './plugins/base'))
    await expect(plugin1).resolves.not.toBeNull()

    const plugin2 = pluginController.initPlugin(path.resolve(__dirname, './plugins/base'))
    await expect(plugin2).rejects.toThrow('Plugin base already loaded')
  })

  it('should get a plugin by name', async () => {
    await pluginController.initPlugin(path.resolve(__dirname, './plugins/base'))
    const plugin = pluginController.getPlugin('base')
    expect(plugin?.manifest.name).toBe('base')
  })

  it('should not load a plugin if not enabled', async () => {
    const plugin = await pluginController.initPlugin('/plugins/example', true)
    expect(plugin?.manifest.name).toBe('test')
    expect(plugin?.load).not.toHaveBeenCalled()
  })

  it('should load a plugin if enabled', async () => {
    const plugin = await pluginController.initPlugin('/plugins/example_enabled', true)
    expect(plugin?.load).toHaveBeenCalled()
  })

  it('should load a plugin when disabled and toggle is called', async () => {
    const plugin = await pluginController.initPlugin('/plugins/example', false)
    await pluginController.togglePlugin('test')
    expect(plugin.load).toHaveBeenCalledOnce()
  })

  it('should unload a plugin when enabled and toggle is called', async () => {
    const plugin = await pluginController.initPlugin('/plugins/example_enabled', true)
    await pluginController.togglePlugin('test_enabled')
    expect(plugin.unload).toHaveBeenCalledOnce()
  })

  it('should fail to enable plugin twice', async () => {
    const plugin = await pluginController.initPlugin('/plugins/example', false)
    let result = pluginController.enablePlugin(plugin)
    await expect(result).resolves.toBeUndefined()

    // Second time
    result = pluginController.enablePlugin(plugin)
    await expect(result).rejects.toThrow()
  })

  it('should fail to disable plugin twice', async () => {
    const plugin = await pluginController.initPlugin('/plugins/example', false)

    await pluginController.enablePlugin(plugin)

    let result = pluginController.disablePlugin(plugin)
    await expect(result).resolves.toBeUndefined()

    // Second time
    result = pluginController.disablePlugin(plugin)
    await expect(result).rejects.toThrow()
  })

  it('should have a list of loaded plugins', async () => {
    await pluginController.initPlugin('/plugins/example', true)
    await pluginController.initPlugin('/plugins/example_enabled', true)
    await pluginController.initPlugin('/plugins/example3', true)

    expect(pluginController.plugins.length).toBe(3)
    expect(pluginController.plugins[0]?.manifest.name).toBe('test')
    expect(pluginController.plugins[1]?.manifest.name).toBe('test_enabled')
    expect(pluginController.plugins[2]?.manifest.name).toBe('test_3')
  })

  it('should call onTest', async () => {
    const plugin = await pluginController.initPlugin('/plugins/example3')
    await pluginController.testPlugin('test_3', {})
    expect(plugin?.onTest).toHaveBeenCalled()
  })

  it('should call onEventCreate AND have access to settings', async () => {
    const plugin = await pluginController.initPlugin('/plugins/example-event-listeners', false)
    const onEventCreate = vi.spyOn(plugin, 'onEventCreate')

    await pluginController.enablePlugin(plugin)
    emitter.emit('event:Create', {})

    await expect.poll(() => onEventCreate).toHaveReturnedWith({ ...MOCK_SETTINGS, enable: true })
  })

  it('should call onEventUpdate AND have access to settings', async () => {
    const plugin = await pluginController.initPlugin('/plugins/example-event-listeners', false)
    const onEventUpdate = vi.spyOn(plugin, 'onEventUpdate')

    await pluginController.enablePlugin(plugin)
    emitter.emit('event:Update', {})

    await expect.poll(() => onEventUpdate).toHaveReturnedWith({ ...MOCK_SETTINGS, enable: true })
  })

  it('should call onEventDelete AND have access to settings', async () => {
    const plugin = await pluginController.initPlugin('/plugins/example-event-listeners', false)
    const onEventDelete = vi.spyOn(plugin, 'onEventDelete')

    await pluginController.enablePlugin(plugin)
    emitter.emit('event:Delete', {})

    await expect.poll(() => onEventDelete).toHaveReturnedWith({ ...MOCK_SETTINGS, enable: true })
  })
})
