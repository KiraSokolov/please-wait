/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * DS208: Avoid top-level this
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
(function(root, factory) {
  if (typeof exports === "object") {
    // CommonJS
    factory(exports);
  } else if ((typeof define === "function") && define.amd) {
    // AMD. Register as an anonymous module.
    define(["exports"], factory);
  } else {
    // Browser globals
    factory(root);
  }
})(this, function(exports) {
  const elm = document.createElement('fakeelement');
  let animationSupport = false;
  let transitionSupport = false;
  let animationEvent = 'animationend';
  let transitionEvent = null;
  const domPrefixes = 'Webkit Moz O ms'.split(' ');
  const transEndEventNames = {
    'WebkitTransition' : 'webkitTransitionEnd',
    'MozTransition' : 'transitionend',
    'OTransition' : 'oTransitionEnd',
    'msTransition' : 'MSTransitionEnd',
    'transition' : 'transitionend'
  };

  for (let key in transEndEventNames) {
    const val = transEndEventNames[key];
    if (elm.style[key] != null) {
      transitionEvent = val;
      transitionSupport = true;
      break;
    }
  }

  if (elm.style.animationName != null) { animationSupport = true; }

  if (!animationSupport) {
    for (let pfx of Array.from(domPrefixes)) {
      if (elm.style[`${pfx}AnimationName`] != null) {
        switch (pfx) {
          case 'Webkit':
            animationEvent = 'webkitAnimationEnd';
            break;
          case 'Moz':
            animationEvent = 'animationend';
            break;
          case 'O':
            animationEvent = 'oanimationend';
            break;
          case 'ms':
            animationEvent = 'MSAnimationEnd';
            break;
        }
        animationSupport = true;
        break;
      }
    }
  }

  // Helpers to add/remove classes, since we don't have our friend jQuery
  const addClass = function(classname, elem) {
    if (elem.classList) {
      return elem.classList.add(classname);
    } else {
      return elem.className += ` ${classname}`;
    }
  };

  const removeClass = function(classname, elem) {
    if (elem.classList) {
      return elem.classList.remove(classname);
    } else {
      return elem.className = elem.className.replace(classname, "").trim();
    }
  };

  class PleaseWait {
    static initClass() {
      this._defaultOptions = {
        backgroundColor: null,
        logo: null,
        loadingHtml: null,
        template: `\
<div class='pg-loading-inner'>
  <div class='pg-loading-center-outer'>
    <div class='pg-loading-center-middle'>
      <h1 class='pg-loading-logo-header'>
        <img class='pg-loading-logo'></img>
      </h1>
      <div class='pg-loading-html'>
      </div>
    </div>
  </div>
</div>\
`,
        onLoadedCallback: null
      };
    }

    constructor(options) {
      const defaultOptions = this.constructor._defaultOptions;
      this.options = {};
      this.loaded = false;
      this.finishing = false;

      // Set initial options, merging given options with the defaults
      for (let k in defaultOptions) {
        const v = defaultOptions[k];
        this.options[k] = (options[k] != null) ? options[k] : v;
      }

      // Create the loading screen element
      this._loadingElem = document.createElement("div");
      // Create an empty array to store the potential list of loading HTML (messages, spinners, etc)
      // we'll be displaying to the screen
      this._loadingHtmlToDisplay = [];
      // Add a global class for easy styling
      this._loadingElem.className = "pg-loading-screen";
      // Set the background color of the loading screen, if supplied
      if (this.options.backgroundColor != null) { this._loadingElem.style.backgroundColor = this.options.backgroundColor; }
      // Initialize the loading screen's HTML with the defined template. The default can be overwritten via options
      this._loadingElem.innerHTML = this.options.template;
      // Find the element that will contain the loading HTML displayed to the user (typically a spinner/message)
      // This can be changed via updateLoadingHtml
      this._loadingHtmlElem = this._loadingElem.getElementsByClassName("pg-loading-html")[0];
      // Set the initial loading HTML, if supplied
      if (this._loadingHtmlElem != null) { this._loadingHtmlElem.innerHTML = this.options.loadingHtml; }
      // Set a flag that lets us know if the transitioning between loading HTML elements is finished.
      // If true, we can transition immediately to a new message/HTML
      this._readyToShowLoadingHtml = false;
      // Find the element that displays the loading logo and set the src if supplied
      this._logoElem = this._loadingElem.getElementsByClassName("pg-loading-logo")[0];
      if (this._logoElem != null) { this._logoElem.src = this.options.logo; }
      // Add the loading screen to the body
      removeClass("pg-loaded", document.body);
      addClass("pg-loading", document.body);
      document.body.appendChild(this._loadingElem);
      // Add the CSS class that will trigger the initial transitions of the logo/loading HTML
      addClass("pg-loading", this._loadingElem);
      // Register a callback to invoke when the loading screen is finished
      this._onLoadedCallback = this.options.onLoadedCallback;

      // Define a listener to look for any new loading HTML that needs to be displayed after the intiial transition finishes
      var listener = evt => {
        this.loaded = true;
        this._readyToShowLoadingHtml = true;
        addClass("pg-loaded", this._loadingHtmlElem);
        if (animationSupport) { this._loadingHtmlElem.removeEventListener(animationEvent, listener); }
        if (this._loadingHtmlToDisplay.length > 0) { this._changeLoadingHtml(); }
        if (this.finishing) {
          // If we reach here, it means @finish() was called while we were animating in, so we should
          // call @_finish() immediately. This registers a new event listener, which will fire
          // immediately, instead of waiting for the *next* animation to end. We stop propagation now
          // to prevent this conflict
          if (evt != null) {
            evt.stopPropagation();
          }
          return this._finish();
        }
      };

      if (this._loadingHtmlElem != null) {
        // Detect CSS animation support. If not found, we'll call the listener immediately. Otherwise, we'll wait
        if (animationSupport) {
          this._loadingHtmlElem.addEventListener(animationEvent, listener);
        } else {
          listener();
        }

        // Define listeners for the transtioning out and in of new loading HTML/messages
        this._loadingHtmlListener = () => {
          // New loading HTML has fully transitioned in. We're now ready to show a new message/HTML
          this._readyToShowLoadingHtml = true;
          // Remove the CSS class that triggered the fade in animation
          removeClass("pg-loading", this._loadingHtmlElem);
          if (transitionSupport) { this._loadingHtmlElem.removeEventListener(transitionEvent, this._loadingHtmlListener); }
          // Check if there's still HTML left in the queue to display. If so, let's show it
          if (this._loadingHtmlToDisplay.length > 0) { return this._changeLoadingHtml(); }
        };

        this._removingHtmlListener = () => {
          // Last loading HTML to display has fully transitioned out. Time to transition the new in
          this._loadingHtmlElem.innerHTML = this._loadingHtmlToDisplay.shift();
          // Add the CSS class to trigger the fade in animation
          removeClass("pg-removing", this._loadingHtmlElem);
          addClass("pg-loading", this._loadingHtmlElem);
          if (transitionSupport) {
            this._loadingHtmlElem.removeEventListener(transitionEvent, this._removingHtmlListener);
            return this._loadingHtmlElem.addEventListener(transitionEvent, this._loadingHtmlListener);
          } else {
            return this._loadingHtmlListener();
          }
        };
      }
    }

    finish(immediately, onLoadedCallback) {
      // Our nice CSS animations won't run until the window is visible. This is a problem when the
      // site is loading in a background tab, since the loading screen won't animate out until the
      // window regains focus, which makes it look like the site takes forever to load! On browsers
      // that support it (IE10+), use the visibility API to immediately hide the loading screen if
      // the window is hidden
      if (immediately == null) { immediately = false; }
      if (window.document.hidden) { immediately = true; }

      // NOTE: if @loaded is false, the screen is still initializing. In that case, set @finishing to
      // true and let the existing listener handle calling @_finish for us. Otherwise, we can call
      // @_finish now to start the dismiss animation
      this.finishing = true;
      if (onLoadedCallback != null) { this.updateOption('onLoadedCallback', onLoadedCallback); }
      if (this.loaded || immediately) {
        // Screen has fully initialized, so we are ready to close
        return this._finish(immediately);
      }
    }

    updateOption(option, value) {
      switch (option) {
        case 'backgroundColor':
          return this._loadingElem.style.backgroundColor = value;
        case 'logo':
          return this._logoElem.src = value;
        case 'loadingHtml':
          return this.updateLoadingHtml(value);
        case 'onLoadedCallback':
          return this._onLoadedCallback = value;
        default:
          throw new Error(`Unknown option '${option}'`);
      }
    }

    updateOptions(options) {
      if (options == null) { options = {}; }
      return (() => {
        const result = [];
        for (let k in options) {
          const v = options[k];
          result.push(this.updateOption(k, v));
        }
        return result;
      })();
    }

    updateLoadingHtml(loadingHtml, immediately) {
      if (immediately == null) { immediately = false; }
      if (this._loadingHtmlElem == null) { throw new Error("The loading template does not have an element of class 'pg-loading-html'"); }
      if (immediately) {
        // Ignore any loading HTML that may be queued up. Show this immediately
        this._loadingHtmlToDisplay = [loadingHtml];
        this._readyToShowLoadingHtml = true;
      } else {
        // Add to an array of HTML to display to the user
        this._loadingHtmlToDisplay.push(loadingHtml);
      }
      // If ready, let's display the new loading HTML
      if (this._readyToShowLoadingHtml) { return this._changeLoadingHtml(); }
    }

    // Private method to immediately change the loading HTML displayed
    _changeLoadingHtml() {
      this._readyToShowLoadingHtml = false;
      // Remove any old event listeners that may still be attached to the DOM
      this._loadingHtmlElem.removeEventListener(transitionEvent, this._loadingHtmlListener);
      this._loadingHtmlElem.removeEventListener(transitionEvent, this._removingHtmlListener);
      // Remove any old CSS transition classes that may still be on the element
      removeClass("pg-loading", this._loadingHtmlElem);
      removeClass("pg-removing", this._loadingHtmlElem);

      if (transitionSupport) {
        // Add the CSS class that will cause the HTML to fade out
        addClass("pg-removing", this._loadingHtmlElem);
        return this._loadingHtmlElem.addEventListener(transitionEvent, this._removingHtmlListener);
      } else {
        return this._removingHtmlListener();
      }
    }

    _finish(immediately) {
      if (immediately == null) { immediately = false; }
      if (this._loadingElem == null) { return; }
      // Add a class to the body to signal that the loading screen has finished and the app is ready.
      // We do this here so that the user can display their HTML behind PleaseWait before it is
      // fully transitioned out. Otherwise, the HTML flashes oddly, since there's a brief moment
      // of time where there is no loading screen and no HTML
      addClass("pg-loaded", document.body);
      if (typeof this._onLoadedCallback === "function") { this._onLoadedCallback.apply(this); }

      // Again, define a listener to run once the loading screen has fully transitioned out
      var listener = () => {
        // Remove the loading screen from the body
        document.body.removeChild(this._loadingElem);
        // Remove the pg-loading class since we're done here
        removeClass("pg-loading", document.body);
        if (animationSupport) { this._loadingElem.removeEventListener(animationEvent, listener); }
        // Reset the loading screen element since it's no longer attached to the DOM
        return this._loadingElem = null;
      };

      // Detect CSS animation support. If not found, we'll call the listener immediately. Otherwise, we'll wait
      if (!immediately && animationSupport) {
        // Set a class on the loading screen to trigger a fadeout animation
        addClass("pg-loaded", this._loadingElem);
        // When the loading screen is finished fading out, we'll remove it from the DOM
        return this._loadingElem.addEventListener(animationEvent, listener);
      } else {
        return listener();
      }
    }
  }
  PleaseWait.initClass();

  const pleaseWait = function(options) {
    if (options == null) { options = {}; }
    return new PleaseWait(options);
  };

  exports.pleaseWait = pleaseWait;
  return pleaseWait;
});
