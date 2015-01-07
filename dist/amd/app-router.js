define(["exports", "aurelia-history", "./router", "./pipeline-provider", "./navigation-commands"], function (exports, _aureliaHistory, _router, _pipelineProvider, _navigationCommands) {
  "use strict";

  var _inherits = function (child, parent) {
    if (typeof parent !== "function" && parent !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof parent);
    }
    child.prototype = Object.create(parent && parent.prototype, {
      constructor: {
        value: child,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (parent) child.__proto__ = parent;
  };

  var History = _aureliaHistory.History;
  var Router = _router.Router;
  var PipelineProvider = _pipelineProvider.PipelineProvider;
  var isNavigationCommand = _navigationCommands.isNavigationCommand;
  var AppRouter = (function () {
    var _Router = Router;
    var AppRouter = function AppRouter(history, pipelineProvider) {
      _Router.call(this, history);
      this.pipelineProvider = pipelineProvider;
      document.addEventListener("click", handleLinkClick.bind(this), true);
    };

    _inherits(AppRouter, _Router);

    AppRouter.inject = function () {
      return [History, PipelineProvider];
    };

    AppRouter.prototype.loadUrl = function (url) {
      var _this = this;
      return this.createNavigationInstruction(url).then(function (instruction) {
        return _this.queueInstruction(instruction);
      })["catch"](function (error) {
        console.error(error);

        if (_this.history.previousFragment) {
          _this.navigate(_this.history.previousFragment, false);
        }
      });
    };

    AppRouter.prototype.queueInstruction = function (instruction) {
      var _this2 = this;
      return new Promise(function (resolve) {
        instruction.resolve = resolve;
        _this2.queue.unshift(instruction);
        _this2.dequeueInstruction();
      });
    };

    AppRouter.prototype.dequeueInstruction = function () {
      var _this3 = this;
      if (this.isNavigating) {
        return;
      }

      var instruction = this.queue.shift();
      this.queue = [];

      if (!instruction) {
        return;
      }

      this.isNavigating = true;

      var context = this.createNavigationContext(instruction);
      var pipeline = this.pipelineProvider.createPipeline(context);

      pipeline.run(context).then(function (result) {
        _this3.isNavigating = false;

        if (result.completed) {
          _this3.history.previousFragment = instruction.fragment;
        }

        if (result.output instanceof Error) {
          console.error(result.output);
        }

        if (isNavigationCommand(result.output)) {
          result.output.navigate(_this3);
        } else if (!result.completed && _this3.history.previousFragment) {
          _this3.navigate(_this3.history.previousFragment, false);
        }

        instruction.resolve(result);
        _this3.dequeueInstruction();
      });
    };

    AppRouter.prototype.registerViewPort = function (viewPort, name) {
      var _this4 = this;
      name = name || "default";
      this.viewPorts[name] = viewPort;

      if (!this.isActive) {
        this.configureRouterForViewPort(viewPort, function () {
          return _this4.activate();
        });
      } else {
        this.configureRouterForViewPort(viewPort, function () {
          return _this4.dequeueInstruction();
        });
      }
    };

    AppRouter.prototype.activate = function (options) {
      if (this.isActive) {
        return;
      }

      this.isActive = true;
      this.options = Object.assign({ routeHandler: this.loadUrl.bind(this) }, this.options, options);
      this.history.activate(this.options);
      this.dequeueInstruction();
    };

    AppRouter.prototype.deactivate = function () {
      this.isActive = false;
      this.history.deactivate();
    };

    AppRouter.prototype.reset = function () {
      _Router.prototype.reset.call(this);
      this.queue = [];
      delete this.options;
    };

    return AppRouter;
  })();

  exports.AppRouter = AppRouter;


  function handleLinkClick(evt) {
    if (!this.isActive) {
      return;
    }

    var target = evt.target;
    if (target.tagName != "A") {
      return;
    }

    if (this.history._hasPushState) {
      if (!evt.altKey && !evt.ctrlKey && !evt.metaKey && !evt.shiftKey && targetIsThisWindow(target)) {
        var href = target.getAttribute("href");

        if (href !== null && !(href.charAt(0) === "#" || /^[a-z]+:/i.test(href))) {
          evt.preventDefault();
          this.history.navigate(href);
        }
      }
    }
  }

  function targetIsThisWindow(target) {
    var targetWindow = target.getAttribute("target");

    return !targetWindow || targetWindow === window.name || targetWindow === "_self" || targetWindow === "top" && window === window.top;
  }
});