# Custom CSS <badge type='warning'>Since 1.19.0</badge> <badge type='danger'>BETA</badge>

Is it possible to modify the style by integrating some custom css in `Admin > Theme > Custom CSS`

Don't imagine you can accomplish miracles because the templates are not designed to be easily modified,
but don't be afraid to [open an issue](https://framagit.org/les/gancio/-/issues) or even better a PR to add some css selectors or some usage examples to this page.

Also note that for every element you want to change the style to, you need to overload the style already there: css has an order to choose which one to use, in case of conflict the more specific selector win (or you need to specify !important).

### Remove navbar

```css
#navbar {
  display: none !important;
}
```

### Floating header bar

```css
/* fixed header bar */
#AppBar {
  padding-top: 96px;
}

#AppBar > div:first-of-type {
  position: fixed;
  width: 100%;
  top: 0px;
  z-index: 1;
  background-color: rgb(var(--v-theme-surface), .9);
}
```

### Floating footer

```css
/* fixed footer */
#footer {
  position: sticky;
  bottom: 0px;
}
```

### Remove search bar

```css
.v-input:has(#main-search) {
  display: none;
}
```

### Change aspect ration of the images

```css
.event .img > img {
  aspect-ratio: 0.7 !important;
  max-height: none !important;
}
```

If the images are too big, you can change the max-width:

```css
@media (width > 450px) {
  .events .event {
    max-width: 326px !important;
  }
}
```

### Round edges to the event cards

```css
.event {
  border-radius: 10pt;
}
```

### Kiosk / Fullscreen mode
```css
.fullscreen #AppBar,
.fullscreen #footer {
  display: none;
}
```

```js
const fullScreen = new URLSearchParams(window.location.search).get('fullscreen')
if (fullScreen === 'true') {
  document.body.classList.add('fullscreen')
}
```

::: tip References
[#413](https://framagit.org/les/gancio/-/issues/413), 
[#451](https://framagit.org/les/gancio/-/issues/451), 
[#536](https://framagit.org/les/gancio/-/issues/536), 
[#697](https://framagit.org/les/gancio/-/issues/697)
:::
