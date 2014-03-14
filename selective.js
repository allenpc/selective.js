(function($) {
  'use strict';

  var DEFAULTS = {
    filter:            '*',     // (selector) elements that can be dragged/selected
    ignore:            null,    // (selector) elements that should be ignored
    appendTo:          'body',  // (selector) the element to which the drag selection box should be appended to
    constrainToBounds: true,    // (boolean)  if drag selection should be constrained to the container's bounds
    snap:              true     // (boolean)  TODO: if elements should snap with each other
  };

  var Constants = {
    SELECTEE:    'sl-selectee',
    SELECTING:   'sl-selecting',
    SELECTED:    'sl-selected',
    DESELECTING: 'sl-deselecting',
    DESELECTED:  'sl-deselected',
    CLEAR:       'sl-clear',
    DRAGGED:     'sl-dragged',
    DELETED:     'sl-deleted'
  };

  var Selective = function($root, opt) {
    var _this = this;

    this.$root = $root;
    this.options = $.extend({}, DEFAULTS, opt);

    // Append an element for the drag `$selectbox`, hidden initially
    this.$selectbox = $('<div class="sl-selectbox">')
      .hide()
      .appendTo(this.options.appendTo);

    this.refresh();

    this.$root
      .on('mousedown.selective', function(e) { _this.onMouseDown(e); })
      .on('sl-clear-selections.selective', function() { _this.clearSelections(); })
      .on('sl-refresh.selective', function() { _this.refresh(); })
      .on('sl-destroy.selective', function() { _this.destroy(); })
      .attr({ tabindex: '0' })
      .css({ outline: '0' });

    $(document)
      .on('mousemove.selective', function(e) { _this.onMouseMove(e); })
      .on('mouseup.selective', function(e) { _this.onMouseUp(e); })
      .on('keydown.selective', function(e) { _this.onKeyDown(e); });
  };

  Selective.prototype.destroy = function(e) {
    this.$root.off('.selective');
    $(document).off('.selective');

    this.$root = null;
    this.options = null;
    this.$selectbox = null;
    this.bounds = null;
    this.selectees = null;
  };

  Selective.prototype.onMouseDown = function(e) {
    if (e.button !== 0) return;

    // Clicked on ignored target, prevent all behavior
    if ($(e.target).filter(this.options.ignore).length > 0) return;

    if (this.mouseStarted) {
      this.onMouseUp(e); // if somehow missed mouseUp, clean things up
    }

    this.mouseStarted = true;

    this.refresh();

    // Grab the thing that was clicked on
    var $target = $(e.target).closest('.' + Constants.SELECTEE);
    if ($target.length > 0) {

      // Selectees can be dynamically disabled for dragging/selection by adding
      // the class `.sl-disabled`
      if (!$target.is('.sl-disabled')) {
        // In multi-select mode (CTRL pressed), we toggled the target state without
        // clearing anything out. In single-select mode, we clear out all other selections
        // before setting the target as the new selection
        if (this.isCtrlPressed(e)) { // multi-select mode
          if (this.isSelected($target)) {
            this.setDeselecting($target);
          } else {
            this.setSelecting($target);
            this.setDragTargets(e.pageX, e.pageY, $target);
          }
        } else { // single-select mode
          if (!this.isSelected($target)) {
            this.clearSelections();
            this.setSelecting($target);
          }

          this.setDragTargets(e.pageX, e.pageY, $target);
        }
      } else {
        this.mouseStarted = false;
      }
    } else { // clicked off target
      this.$root.focus();
      e.preventDefault();

      // If we click in blank space, deselect everything except if CTRL
      // is pressed. This is so that the user can multi-select with a drag selection
      if (!this.isCtrlPressed(e)) {
        this.clearSelections();
      }

      // Update the `$selectbox` location in preparation for dragging
      this.$selectbox
        .css({
          left: e.pageX,
          top: e.pageY,
          width: 0,
          height: 0
        })
        .data({
          startX: e.pageX,
          startY: e.pageY
        });
    }
  };

  Selective.prototype.onMouseMove = function(e) {
    if (this.mouseStarted) {
      this.dragStarted = true;

      // If there are things to be dragged, start tracking the delta and update
      // the positions of the drag targets
      if (this.dragTargets && this.dragTargets.length > 0) {
        var diffX = e.pageX - this.dragStart.startX;
        var diffY = e.pageY - this.dragStart.startY;

        this.dragTargets.each(function() {
          var pos = $(this).data('sl-position');
          var startX = pos.left;
          var startY = pos.top;
          $(this).css({
            position: 'absolute',
            left: startX + diffX,
            top: startY + diffY
          });
        });

      } else if (this.$selectbox.parent().length > 0) { // check if it was added to the DOM
        // Redraw selectbox
        var tmp;
        var x1 = this.$selectbox.data('startX');
        var y1 = this.$selectbox.data('startY');
        var x2 = e.pageX;
        var y2 = e.pageY;

        // If `options.constrainToBounds` is `true`, ignore any movement beyond the container
        if (this.options.constrainToBounds) {
          if (x2 < this.bounds.left) { x2 = this.bounds.left; }
          if (x2 > this.bounds.right) { x2 = this.bounds.right; }
          if (y2 < this.bounds.top) { y2 = this.bounds.top; }
          if (y2 > this.bounds.bottom) { y2 = this.bounds.bottom; }
        }

        if (x1 > x2) { tmp = x2; x2 = x1; x1 = tmp; }
        if (y1 > y2) { tmp = y2; y2 = y1; y1 = tmp; }
        this.$selectbox.css({ left: x1, top: y1, width: x2 - x1, height: y2 - y1 }).show();

        // Check for selectee intersections
        var _this = this;
        this.selectees.each(function() {
          var $selectee = $(this);
          var bounds = $(this).data('sl-bounds');
          var intersected = $selectee.is(':visible') && (!(bounds.left > x2 || bounds.right < x1 || bounds.top > y2 || bounds.bottom < y1));

          // As selectees are intersected, toggle their selecting state. If the user then
          // backs off of an element, the element is restored to its initial state
          if (intersected) {
            if (_this.isSelected($selectee)) {
              _this.setDeselecting($selectee);
            } else {
              _this.setSelecting($selectee);
            }
          } else {
            _this.clearSelecting($selectee);
          }
        });
      }
    }
  };

  Selective.prototype.onMouseUp = function(e) {
    if (this.mouseStarted) {
      var _this = this;
      this.mouseStarted = false;

      if (this.dragStarted && this.dragTargets && this.dragTargets.length > 0) {
        this.dragStarted = false;

        // When elements are drag & dropped, trigger an even with their new positions
        this.dragTargets.each(function() {
          $(this).trigger(Constants.DRAGGED, _this.getPosition($(this)));
        });
      }

      this.dragTargets = null;
      this.dragStart = null;

      // Anything put into SELECTING state should now be SELECTED
      this.selectees.each(function() {
        var $selectee = $(this);
        if (_this.isSelecting($selectee)) {
          _this.setSelected($selectee);
        } else if (_this.isDeselecting($selectee)) {
          _this.setDeselected($selectee);
        }
      });

      this.$selectbox
        .removeAttr('style')
        .hide()
        .removeData();
    }
  };

  Selective.prototype.refresh = function() {
    var _this = this;
    this.bounds = this.getBounds(this.$root);
    this.selectees = this.$root.find(this.options.filter).addClass(Constants.SELECTEE);
    this.selectees.each(function() {
      $(this).data('sl-bounds', _this.getBounds($(this)));
      $(this).data('sl-position', _this.getPosition($(this)));
    });

    this.snapPoints = this.getSnapPoints();
  };

  Selective.prototype.getSnapPoints = function() {
    var sp = {
      x: {}, // treat this like a hash set
      y: {}
    };

    // Start with the $root edges
    sp.x[this.bounds.left] = 1;
    sp.x[this.bounds.right] = 1;
    sp.y[this.bounds.top] = 1;
    sp.y[this.bounds.bottom] = 1;

    // TODO: Add the bounds of every selectee
    this.selectees.each(function() {
      var b = $(this).data('sl-bounds');
      sp.x[b.left] = 1;
      sp.x[b.right] = 1;
      sp.y[b.top] = 1;
      sp.y[b.bottom] = 1;
    });

    return sp;
  };

  Selective.prototype.getBounds = function($elem) {
    var offset = $elem.offset();
    return {
      left: offset.left,
      right: offset.left + $elem.width(),
      top: offset.top,
      bottom: offset.top + $elem.height()
    };
  };

  Selective.prototype.getPosition = function($elem) {
    var result = {};
    if ($elem.css('position') !== 'absolute') {
      var pos = $elem.position();
      result.left = pos.left;
      result.top = pos.top;
    } else {
      result.left = parseInt($elem.css('left').match(/-?\d*/)[0]);
      result.top = parseInt($elem.css('top').match(/-?\d*/)[0]);
    }
    return result;
  };

  Selective.prototype.isSelectee = function($elem) {
    return $elem.hasClass(Constants.SELECTEE);
  };

  Selective.prototype.isSelecting = function($elem) {
    return $elem.hasClass(Constants.SELECTING);
  };

  Selective.prototype.isSelected = function($elem) {
    return $elem.hasClass(Constants.SELECTED);
  };

  Selective.prototype.isDeselecting = function($elem) {
    return $elem.hasClass(Constants.DESELECTING);
  };

  Selective.prototype.setSelecting = function($elem, preventTrigger) {
    $elem.addClass(Constants.SELECTING);
    if (!preventTrigger) $elem.trigger(Constants.SELECTING);
  };

  Selective.prototype.clearSelecting = function($elem, preventTrigger) {
    $elem
      .removeClass(Constants.SELECTING)
      .removeClass(Constants.DESELECTING);
    if (!preventTrigger) $elem.trigger(Constants.CLEAR);
  };

  Selective.prototype.setSelected = function($elem, preventTrigger) {
    this.clearSelecting($elem, true);
    $elem.addClass(Constants.SELECTED);
    if (!preventTrigger) $elem.trigger(Constants.SELECTED);
  };

  Selective.prototype.setDeselecting = function($elem, preventTrigger) {
    $elem.addClass(Constants.DESELECTING);
    if (!preventTrigger) $elem.trigger(Constants.DESELECTING);
  };

  Selective.prototype.setDeselected = function($elem, preventTrigger) {
    if (this.isSelected($elem)) {
      this.clearSelecting($elem, true);
      $elem.removeClass(Constants.SELECTED);
      if (!preventTrigger) $elem.trigger(Constants.DESELECTED);
    }
  };

  Selective.prototype.setDragTargets = function(x, y, $target) {
    this.dragTargets = this.selectees.filter('.' + Constants.SELECTED).add($target);
    this.dragStart = {
      startX: x,
      startY: y
    };
  };

  Selective.prototype.clearSelections = function() {
    var _this = this;
    this.selectees.each(function() {
      _this.setDeselected($(this));
    });
  };

  Selective.prototype.isCtrlPressed = function(e) {
    return e.ctrlKey || e.metaKey;
  };

  Selective.prototype.onKeyDown = function(e) {
    // If DEL is pressed, trigger an event for all selected elements
    if (this.$root && this.$root.is(':focus')) {
      if (e.keyCode === 8 || e.keyCode === 46) {
        e.preventDefault(); // prevent default backspace behavior (some browsers treat as "back")
        var _this = this;
        this.selectees.filter('.' + Constants.SELECTED).each(function() {
          _this.setDeselected($(this));
          $(this).trigger(Constants.DELETED);
        });
      }
    }
  };

  $.fn.extend({
    selective: function(opt) {
      this.each(function() {
        new Selective($(this), opt);
      });

      return this;
    }
  });

})(jQuery);
