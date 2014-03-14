selective.js
==

`selective.js` is a simple jQuery plugin to enable DOM element drag, drop, selection, and deletion. It's meant to be a lightweight alternative to jQuery UI's [Draggable](https://jqueryui.com/draggable) and [Selectable](https://jqueryui.com/selectable/).

Usage
--
Once `selective.js` is applied to an element, the DOM elements within will be able to be dragged & selected.

```javascript
$('#container').selective();
```

Calls to `.selective()` can be passed the following options:
* `filter` (selector, default: `'*'`) elements that can be dragged/selected
* `ignore` (selector, default: `null`) elements that should be ignored
* `appendTo` (selector, default: `'body'`) the element to which the drag selection box should be appended to
* `constrainToBounds` (boolean, default: `true`) if drag selection should be constrained to the container's bounds

CSS
--
Elements can be styled depending on their state using the following CSS classes:

* `sl-selecting`
* `sl-selected`
* `sl-deselecting`
* `sl-deselected`

When a user attempts to make multiple selections using dragging, `div#sl-selectbox` will be used to indicate the selection region. In order for it to be visible, you must provide styles yourself. Here is a good starting point:

```css
.sl-selectbox {
border: 1px solid #000;
background-color: #ccc;
position: absolute;
z-index: 9999;
opacity: 0.2;
}
```

Events
--
When elements are interacted with, the following DOM events will be fired:

* `sl-selecting`
* `sl-selected`
* `sl-deselecting`
* `sl-deselected`
* `sl-clear`
* `sl-dragged`
* `sl-deleted`

For example, to support deletion:

```javascript
$('.component').on('sl-deleted', function() {
$(this).remove();
});
```

Building
--
```sh
npm install -g grunt-cli
```
```sh
grunt
```
