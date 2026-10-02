<script setup>

import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
const { $prompt } = useNuxtApp()

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  height: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const editor = useEditor({
  content: props.modelValue || '',
  extensions: [StarterKit],
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  }
})

const focused = ref(false)

const isLabelFloating = computed(() => {
  return focused.value || editor.value?.getText().trim().length > 0
})

onMounted(() => {
  editor.value?.on('focus', () => (focused.value = true))
  editor.value?.on('blur', () => (focused.value = false))
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})

async function askLink () {
  const url = await $prompt('URL', 'Insert Link', '', editor.value?.getAttributes('link').href || '')
  if (url === false) return
  if (url) {
    editor.value?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  } else {
    editor.value?.chain().focus().unsetLink().run()
  }
}
</script>

<template>
<div class='v-editor' :class='{focused}'>
  <label :class="{ float: isLabelFloating }">{{ label }}</label>
  <div class='editor-menu-bar menubar'>
    <v-btn-toggle density='compact'>

      <v-btn
        tabindex='-1'
        icon='mdi-format-bold' variant='text'
        :active="editor?.isActive('bold')"
        @click="editor.chain().focus().toggleBold().run()" />

      <v-btn
        tabindex='-1'
        icon='mdi-format-underline' variant='text'
        :active="editor?.isActive('underline')"
        @click="editor.chain().focus().toggleUnderline().run()" />

      <v-btn
        tabindex='-1'
        icon='mdi-format-strikethrough' variant='text'
        :active="editor?.isActive('strike')"
        @click="editor.chain().focus().toggleStrike().run()" />

      <v-btn
        tabindex='-1'
        icon='mdi-format-italic' variant='text'
        :active="editor?.isActive('italic')"
        @click="editor.chain().focus().toggleItalic().run()" />

      <v-btn
        tabindex='-1'
        icon='mdi-format-header-1'
        :active="editor?.isActive('heading', { level: 1 })"
        @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
      />

      <v-btn
        tabindex='-1'
        icon='mdi-format-header-2'
        :active="editor?.isActive('heading', { level: 2 })"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
      />

      <v-btn
        tabindex='-1'
        icon='mdi-format-header-3'
        :active="editor?.isActive('heading', { level: 3 })"
        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
      />

      <v-btn
        tabindex='-1'
        icon='mdi-code-tags'
        :active="editor?.isActive('code')"
        @click="editor.chain().focus().toggleCode().run()"
      />

      <v-btn
        tabindex='-1'
        icon='mdi-format-quote-open'
        :active="editor?.isActive('blockquote')"
        @click="editor.chain().focus().toggleBlockquote().run()"
      />

      <v-btn
        tabindex='-1'
        icon='mdi-format-list-bulleted'
        :active="editor?.isActive('bullet_list')"
        @click="editor.chain().focus().toggleBulletList().run()"
      />

      <v-btn
        tabindex='-1'
        icon="mdi-link"
        :active="editor?.isActive('link')"
        @click='askLink'
      />

      <!-- v-if="editor?.isActive('link')" -->
      <!-- <v-text-field
        ref="link"
        v-model="linkUrl"
        @blur="setLink"
        @keypress.enter.prevent="setLink"
        placeholder="Enter URL"
        density="compact"
        style="width: 150px"
        hide-details
      /> -->
      <!-- TODO -->

    </v-btn-toggle>
    <!--

      v-btn(icon text tabindex='-1'
        :class="{ primary: isActive.bullet_list() }"
        @click="commands.bullet_list")
        v-icon(v-text='mdiFormatListBulleted')

      v-btn(icon text tabindex='-1' :class='{ primary: isActive.link() }'
        @click='commands.link({href: getMarkAttrs("link") && getMarkAttrs("link").href ? "" : "https://"}); $refs.link.focus();')
          v-icon(v-text='mdiLink')
      v-text-field.pt-0.ml-1(v-show='isActive.link()' ref='link' @focus='focus' @blur='e => { blur(); commands.link({ href: e.target.value}) }' hide-details
          :value='isActive.link() && getMarkAttrs("link") && getMarkAttrs("link").href || ""'
          @keypress.enter='commands.link({ href: $event.target.value}); editor.focus()') -->
  </div>

  <EditorContent :editor="editor" class="v-editor__content" :style="{ height }" :label='label' :aria-label='label'  />

</div>
</template>
<style lang='css'>
.v-editor {
  position: relative;
  padding: 20px 12px 8px;
  transition: border-color 0.2s;
  min-height: 100px;
}

.v-editor .tiptap {
  background-color: #eee;
}

.v-theme--dark .v-editor .tiptap {
  background-color: #292929;
}

.v-editor label {
  /*position: absolute;*/
  left: 12px;
  top: 16px;
  /*font-size: 16px;*/
  color: #666;
  transition: all 0.2s;
  pointer-events: none;
}

.v-editor label.float {
  top: 4px;
  font-size: 12px;
  color: black;
}

/* .v-editor__content {
  outline: none;
  min-height: 60px;
  font-size: 16px;
  line-height: 1.5;
} */

.focused .menubar {
  visibility: visible !important;
  opacity: 1 !important;
}

.menubar {
  transition: opacity .5s;
  /*opacity: 0;*/
  /*visibility: hidden;*/
  overflow: auto;
}

.tiptap {
    padding: 5px 15px 0px 15px;
    outline: 0;
    min-height: 150px;
    height: 100%;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #FF4500 transparent;
    overflow-y: auto;
  }

</style>

<!-- <template>
  <div
    class="v-editor"
    :class="{ focused, invalid: hasError }"
    @click="focusEditor"
  >
    <label :class="{ float: isLabelFloating }">{{ label }}</label>

    <EditorContent :editor="editor" class="v-editor__content" />

    <div class="v-editor__underline"></div>

    <div class="v-editor__messages">
      <span v-if="hasError" class="error">{{ error }}</span>
      <span v-else-if="hint" class="hint">{{ hint }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'

const props = defineProps({
  modelValue: String,
  label: String,
  hint: String,
  error: String,
})

const emit = defineEmits(['update:modelValue'])

const editor = useEditor({
    content: props.modelValue || '',
    extensions: [StarterKit],
    onUpdate: ({ editor }) => {
      emit('update:modelValue', editor.getHTML())
    },
  })

const focused = ref(false)

const isLabelFloating = computed(() => {
  return focused.value || editor.value?.getText().trim().length > 0
})

const hasError = computed(() => !!props.error)

function focusEditor() {
  editor.value?.chain().focus().run()
}

onMounted(() => {
  editor.value?.on('focus', () => (focused.value = true))
  editor.value?.on('blur', () => (focused.value = false))
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<style scoped>
.v-editor {
  position: relative;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 20px 12px 8px;
  transition: border-color 0.2s;
  min-height: 100px;
}

.v-editor.focused {
  border-color: #1976d2;
}

.v-editor.invalid {
  border-color: red;
}

.v-editor label {
  position: absolute;
  left: 12px;
  top: 16px;
  font-size: 16px;
  color: #666;
  transition: all 0.2s;
  pointer-events: none;
}

.v-editor label.float {
  top: 4px;
  font-size: 12px;
  color: #1976d2;
}

.v-editor__content {
  outline: none;
  min-height: 60px;
  font-size: 16px;
  line-height: 1.5;
}

.v-editor__underline {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  width: 100%;
  background: #1976d2;
  transform: scaleX(0);
  transition: transform 0.2s;
}

.v-editor.focused .v-editor__underline {
  transform: scaleX(1);
}

.v-editor__messages {
  font-size: 12px;
  padding: 4px 12px 0;
}

.v-editor__messages .error {
  color: red;
}

.v-editor__messages .hint {
  color: #999;
}
</style> -->
