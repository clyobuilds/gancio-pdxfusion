// a small script to fill instances info from docs/instances.json
import { writeFileSync } from 'fs'
import { htmlToText } from 'html-to-text'
import { ofetch } from 'ofetch'

export async function getNodeInfo(instance_url: string) {
  let nodeInfo = await ofetch(`${instance_url}/.well-known/nodeinfo`, { headers: { Accept: 'application/json' } })
    .catch((e) => {
      console.warn('get node info failed', e)
    })

  if (nodeInfo?.links) {
    const supportedVersion = nodeInfo.links.find(l => l.rel === 'http://nodeinfo.diaspora.software/ns/schema/2.1' || 'http://nodeinfo.diaspora.software/ns/schema/2.0')
    if (!supportedVersion) {
      console.info('No nodeinfo version supported!')
      return
    }
    const applicationActor = nodeInfo.links.find(l => l.rel === 'https://www.w3.org/ns/activitystreams#Application')
    nodeInfo = await ofetch(supportedVersion?.href)

    if (nodeInfo) {
      return { applicationActor: applicationActor?.href, nodeInfo }
    }
  }
}

async function getInstanceInfo(instance) {
  const urlObj = new URL(instance.url)
  const url = `${urlObj.protocol}//${urlObj.hostname}`
  const ret = await getNodeInfo(url).catch((e) => {
    console.warn('get node info failed', e)
    return
  })
  if (!ret) return
  const { applicationActor: applicationActorUrl, nodeInfo } = ret
  let applicationActor
  if (applicationActorUrl) {
    applicationActor = await ofetch(applicationActorUrl, {
      headers: {
        'Content-Type': 'application/activity+json',
        'Accept': 'application/activity+json'
      }
    }).catch((e) => {
      console.warn('get application actor failed', e)
      return null
    })
  } else {
    console.error('applicationActorUrl is null', applicationActorUrl)
  }

  return {
    name: applicationActor?.name ?? nodeInfo?.metadata?.nodeName,
    url: url,
    logo: applicationActor?.icon?.url ?? `${url}/logo.png`,
    place: instance.place,
    summary: htmlToText(applicationActor?.summary ?? nodeInfo?.metadata?.nodeDescription),
    timezone: nodeInfo?.metadata?.nodeTimezone,
    handler: applicationActor?.preferredUsername ? `${applicationActor?.preferredUsername}@${urlObj.hostname}` : null
  }
}

async function main() {
  const { default: instances_original } = await import('../docs/instances_original.json', { with: { type: 'json' } })
  const { default: new_instances } = await import('../docs/instances.json', { with: { type: 'json' } })
  const instances = instances_original.filter(instance => !new_instances.some(
    i => new URL(i.url).hostname === new URL(instance.url).hostname)
  )
  for (const instance of instances) {
    const info = await getInstanceInfo(instance)
    if (info) {
      new_instances.push(info)
      console.error('instances ', info)
      writeFileSync('./docs/instances.json', JSON.stringify(new_instances, null, 2))
    }
  }
}

main()
