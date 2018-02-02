    var ElementsView = Backbone.View.extend(/**@lends ElementsView#*/{
        /**
         * Cached window object wrapped to {@link Backbone.$}
         * @type {$}
         * @protected
         */
        _$window: Backbone.$(window),

        /**
         * Cached document object wrapped to {@link Backbone.$}
         * @type {$}
         * @protected
         */
        _$document: Backbone.$(document),

        /**
         * Cached document.body object wrapped to {@link Backbone.$}
         * @type {$}
         * @protected
         */
        _$body: Backbone.$(document.body),

        /**
         * @constructs
         */
        initialize: function () {
            var originResult = Backbone.View.prototype.initialize.apply(this, arguments);

            /**
             * Object to store cached CSS classes gotten from {@link ElementsView#_classes}
             * @type {?Object.<string>}
             * @private
             */
            this._cachedClasses = null;

            /**
             * Object to store cached CSS selectors gotten from {@link ElementsView#_selectors} and calculated using
             * {@link ElementsView#_cachedClasses}
             * @type {?Object.<string>}
             * @private
             */
            this._cachedSelectors = null;

            /**
             * Cached elements, used by {@link ElementsView#_elem}
             * @type {Object.<$>}
             * @private
             */
            this._cachedElements = {};

            return originResult;
        },

        /**
         * @public
         * @returns {ElementsView}
         * @see {@link Backbone.View#setElement}
         */
        setElement: function () {
            var originResult = Backbone.View.prototype.setElement.apply(this, arguments);

            /**
             * Data attributes of {@link Backbone.View.$el}. Keys are in camelCase, values are expected types, numbers
             * are instances of Number, JSON parsed to objects and so on.
             * @type {Object.<*>}
             * @protected
             */
            this._data = this.$el.data() || {};
            this._dropElemCache();
            return originResult;
        },

        /**
         * Place here CSS classes used in a View. Method should return an object, which keys are readable class names
         * and values are CSS classes. You can extend this method in child classes.
         * @returns {Object.<string>}
         * @protected
         * @example Routine use
         * <code class="javascript">
         * _classes: function(){
         *     return {
         *         activeItem: 'very-long-css-class-for-active-state-for-some-item'
         *     };
         * }
         * </code>
         * Then you can get the class this way:
         * `this._class('activeItem')`
         * or selector for the class
         * `this._selector('activeItem')` // returns dot + class
         * or even elements with the class
         * `this._elem('activeItem')`
         * Please note the {@link ElementsView#_elem} method caches results, so if you dynamically set the class to
         * different elements use {@link ElementsView#_findElem} instead
         * @example Using with placeholders
         * You can use placeholders for class generation
         * <code class="javascript">
         * _classes: function(){
         *     return {
         *         itemOfType: 'item_type_%s',
         *         namedItem: 'item-%(name)s'
         *     };
         * }
         * </code>
         * then in code
         * `this._class('itemOfType', 'apple')` // item_type_apple
         * `this._class('namedItem', {name: 'note'})` // item-note
         * this is work for {@link ElementsView#_selector}, {@link ElementsView#_elem} and other methods
         */
        _classes: function () {
            return {};
        },

        /**
         * Method for lazy retrieving classes from the results of {@link ElementsView#_classes}
         * @param {string} name
         * @returns {string|undefined}
         * @private
         */
        _retrieveClass: function (name) {
            if (!this._cachedClasses) {
                this._cachedClasses = this._classes();
            }
            return this._cachedClasses[name];
        },

        /**
         * Returns CSS class by its name. Classes are described in {@link ElementsView#_classes}
         * @param {String} name Key from {@link ElementsView#_classes}
         * @param {...string|object} [placeholders] values for placeholders, see examples
         * @returns {String} CSS class
         * @throws {Error} if the name does not match any key in {@link ElementsView#_classes} or value for the key is
         * empty
         * @protected
         * @example Suppose we have classes described like this:
         * <code class="javascript">
         * _classes: function(){
         *     return {
         *         activeItem: 'item_active_yes',
         *         itemOfType: 'item_type_%s',
         *         namedItem: 'item-%(name)s'
         *     };
         * }
         * </code>
         * Then in code we can get the class this way:
         * `this._class('activeItem')`                  // item_active_yes
         * `this._class('itemOfType', 'apple')`         // item_type_apple
         * `this._class('namedItem', {name: 'note'})`   // item-note
         * more often it needed for {@link ElementsView#_addClass} and {@link ElementsView#_removeClass} methods
         */
        _class: function (name, placeholders) {
            var cl = this._retrieveClass(name);
            if (!cl) {
                throw new Error('CSS class for `' + name + '` does not found');
            }

            if (arguments.length > 1) {
                cl = replace(cl, arguments);
            }

            return cl;
        },

        /**
         * @param {String} method
         * @param {String|Array.<String>} cls
         * @param {String|Array.<String>|$} [elem=this.$el]
         * @param {Array} [methodArgs]
         * @returns {Boolean|$}
         * @private
         */
        _runClassMethod: function (method, cls, elem, methodArgs) {
            var $el = elem ?
                    Array.isArray(elem) ? this._elem.apply(this, elem) :
                        typeof elem === 'string' ? this._elem(elem) :
                            elem
                    : this.$el,
                builtClass = Array.isArray(cls) ? this._class.apply(this, cls) : this._class(cls);
            if (typeof methodArgs !== 'undefined') {
                methodArgs.unshift(builtClass);
            } else {
                methodArgs = [builtClass];
            }
            return $el[method].apply($el, methodArgs);
        },

        /**
         * Checks the element has CSS class described in {@link ElementsView#_classes} 
         * @param {String|Array.<String>} cls class name, if you want to use placeholders pass the array (see examples)
         * @param {String|Array.<String>|$} [elem=this.$el] element name, checks the root element if not specified
         * @returns {Boolean}
         * @protected
         * @example Checking {@link Backbone.View.$el} has a class specified in {@link ElementsView#_classes}
         * `this._hasClass('active')`
         * @example Checking some child element has a class specified in {@link ElementsView#_classes}. For retrieving
         * element the {@link ElementsView#_elem} method is used
         * `this._hasClass('active', 'someItem')`
         * @example Usage with placeholders
         * `this._hasClass(['namedItem', 'itsName'], 'elemName')`
         */
        _hasClass: function (cls, elem) {
            return this._runClassMethod('hasClass', cls, elem);
        },

        /**
         * Add CSS class described in {@link ElementsView#_classes} to element
         * @param {String|Array.<String>} cls class name, if you want to use placeholders pass the array (see examples)
         * @param {String|Array.<String>|$} [elem=this.$el] element name, adds to the root element if not specified
         * @returns {$}
         * @protected
         * @example Adding a class specified in {@link ElementsView#_classes} to the {@link Backbone.View.$el}
         * `this._addClass('active')`
         * @example Adding a class specified in {@link ElementsView#_classes} to some child element. For retrieving
         * element the {@link ElementsView#_elem} method is used
         * `this._addClass('active', 'someItem')`
         * @example Usage with placeholders
         * `this._addClass(['namedItem', 'itsName'], 'elemName')`
         */
        _addClass: function (cls, elem) {
            return this._runClassMethod('addClass', cls, elem);
        },

        /**
         * Remove CSS class described in {@link ElementsView#_classes} to element
         * @param {String|Array.<String>} cls class name, if you want to use placeholders pass the array (see examples)
         * @param {String|Array.<String>|$} [elem=this.$el] element name, removes from the root element if not specified
         * @returns {$}
         * @protected
         * @example Removing a class specified in {@link ElementsView#_classes} from the {@link Backbone.View.$el}
         * `this._removeClass('active')`
         * @example Removing a class specified in {@link ElementsView#_classes} from some child element. For retrieving
         * element the {@link ElementsView#_elem} method is used
         * `this._removeClass('active', 'someItem')`
         * @example Usage with placeholders
         * `this._removeClass(['namedItem', 'itsName'], 'elemName')`
         */
        _removeClass: function (cls, elem) {
            return this._runClassMethod('removeClass', cls, elem);
        },

        /**
         * Toggle CSS class described in {@link ElementsView#_classes} on element
         * @param {String|Array.<String>} cls class name, if you want to use placeholders pass the array (see examples)
         * @param {String|Array.<String>|$} [elem=this.$el] element name, toggles to the root element if not specified
         * @param {Boolean} [toggle]
         * @returns {$}
         * @protected
         * @example Toggling a class specified in {@link ElementsView#_classes} on the {@link Backbone.View.$el}
         * `this._toggleClass('active', true)`
         * @example Toggling a class specified in {@link ElementsView#_classes} on some child element. For retrieving
         * element the {@link ElementsView#_elem} method is used
         * `this._toggleClass('active', 'someItem', false)`
         * @example Usage with placeholders
         * `this._toggleClass(['namedItem', 'itsName'], 'elemName', true)`
         */
        _toggleClass: function (cls, elem, toggle) {
            if (arguments.length === 2) {
                if (typeof elem === 'boolean') {
                    toggle = elem;
                    elem = undefined;
                }
            }
            return this._runClassMethod('toggleClass', cls, elem, [toggle]);
        },

        /**
         * Place here selectors used in a View. Method should return an object, which keys are readable selector names
         * and values are CSS selector. You can extend this method in child classes.
         * @returns {Object.<string>}
         * @protected
         * @example Routine use
         * <code class="javascript">
         * _selectors: function(){
         *     return {
         *         firstLevelItem: '.list>.item'
         *     };
         * }
         * </code>
         * Then you can get the selector this way:
         * `this._selector('firstLevelItem')`
         * or elements selected by it
         * `this._elem('firstLevelItem')`
         * @example Using with placeholders
         * You can use placeholders for selector generation
         * <code class="javascript">
         * _selectors: function(){
         *     return {
         *         itemById: '.item[data-id=%s]',
         *         namedItem: '.item-%(name)s'
         *     };
         * }
         * </code>
         * then in code
         * `this._selector('itemById', 3)` // .item[data-id=3]
         * `this._elem('namedItem', {name: 'note'})` // finds child elements by .item-note selector
         */
        _selectors: function () {
            return {};
        },

        /**
         * Method for lazy retrieving selectors from the results of {@link ElementsView#_selectors}
         * @param {string} name
         * @returns {string|undefined}
         * @private
         */
        _retrieveSelector: function (name) {
            if (!this._cachedSelectors) {
                this._cachedSelectors = this._selectors();
            }
            return this._cachedSelectors[name];
        },

        /**
         * Returns CSS selector by its name. Selectors are described in {@link ElementsView#_selectors}
         * @param {String} name Key from {@link ElementsView#_selectors}
         * @param {...string|Object} [placeholders] values for placeholders, see examples
         * @returns {String} CSS selector
         * @throws {Error} if the name does not match any key in {@link ElementsView#_selectors} and
         * {@link ElementsView#_classes}
         * @protected
         * @example Suppose we have selectors described like this:
         * <code class="javascript">
         * _selectors: function(){
         *     return {
         *         firstLevelItem: '.list>.item',
         *         itemById: '.item[data-id=%s]',
         *         namedItem: '.item-%(name)s'
         *     };
         * }
         * </code>
         * Then in code we can get the class this way:
         * `this._selector('firstLevelItem')`             // .list>.item
         * `this._selector('itemById', 'apple')`          // .item[data-id=apple]
         * `this._selector('namedItem', {name: 'note'})`  // .item-note
         * more often it needed for {@link ElementsView#_elem} and {@link ElementsView#_findElem} methods
         * @example Using at {@link Backbone.View#events}
         * <code class="javascript">
         * events: function(){
         *     var events = {};
         *     events['click ' + this._selector('firstLevelItem')] = this._onItemClick;
         *     return events;
         * }
         * </code>
         */
        _selector: function (name, placeholders) {
            var cacheKey = this._getCacheKey.apply(this, arguments),
                selector = this._retrieveSelector(cacheKey);

            if (typeof selector === 'undefined') {
                selector = this._cachedSelectors[name];
                if (typeof selector === 'undefined') {
                    selector = '.' + this._class(name);
                    this._cachedSelectors[name] = selector;
                }

                if (arguments.length > 1) {
                    selector = replace(selector, arguments);
                    this._cachedSelectors[cacheKey] = selector;
                }
            }

            return selector;
        },

        /**
         * Returns true if selector with the name is descried in {@link ElementsView#_classes} or
         * {@link ElementsView#_selectors}
         * @param {String} name Selector name
         * @returns {Boolean}
         * @protected
         */
        _hasDescribedSelector: function (name) {
            return !!(this._retrieveClass(name) || this._retrieveSelector(name));
        },

        /**
         * Returns jQuery or Zepto {@link Backbone#$} collection of elements by the name described in
         * {@link ElementsView#_selectors} or {@link ElementsView#_classes}. Caches results so you do not need to
         * remember them to properties. Use {@link ElementsView#_dropElemCache} to clean caches
         * @param {String} name The name of searching element
         * @param {...string|object} [placeholders] values for placeholders, see examples
         * @returns {$}
         * @protected
         * @example <code class="javascript">
         * var Page = ElementsView.extend({
         *     _classes: function () {
         *         return {
         *             popup: 'my-class-for-popups'
         *         };
         *     },
         *
         *     _selectors: function () {
         *         return {
         *             popupByName: '.popup[data-name=%s]'
         *         };
         *     },
         *
         *     initialize: function () {
         *         ElementsView.prototype.initialize.apply(this, arguments);
         *
         *         this._elem('popupByName', 'greeting').show();
         *         var $allPopups = this._elem('popup');
         *     }
         * });
         * </code>
         */
        _elem: function (name, placeholders) {
            var cacheKey = this._getCacheKey.apply(this, arguments),
                $elem = this._cachedElements[cacheKey];

            if ($elem) {
                return $elem;
            }

            $elem = this._findElem.apply(this, arguments);
            this._cachedElements[cacheKey] = $elem;

            return $elem;
        },

        /**
         * Returns unique string for passed arguments
         * @param {String} name
         * @param {...string} [placeholders]
         * @returns {string}
         * @private
         */
        _getCacheKey: function (name, placeholders) {
            return Array.prototype.join.call(arguments, '|');
        },

        /**
         * Finds element without using cache
         * @param {string} name
         * @param {...string|object} [placeholders]
         * @returns {$}
         * @protected
         * @example <code class="javascript">
         * var SomeElement = ElementsView.extend({
         *     _classes: function () {
         *         return {
         *             activeDropdown: 'dropdown_active'
         *         };
         *     },
         *
         *     _selectors: function () {
         *         return {
         *             dropdownByN: '.dropdown:eq(%s)'
         *         };
         *     },
         *
         *     initialize: function () {
         *         ElementsView.prototype.initialize.apply(this, arguments);
         *
         *         this._addClass('activeDropdown', ['dropdownByN', 2]);
         *         var $activeDropdown = this._elem('activeDropdown'); // caches activeDropdown
         *         this._removeClass('activeDropdown', ['dropdownByN', 2]);
         *         this._addClass('activeDropdown', ['dropdownByN', 3]);
         *         // how to get active dropdown? _elem returns dropdown with number 2
         *         $activeDropdown = this._findElem('activeDropdown'); // ignores caches
         *     }
         * });
         * </code>
         */
        _findElem: function (name, placeholders) {
            return this.$(this._selector.apply(this, arguments));
        },

        /**
         * Clears the cache for {@link ElementsView._elem}
         * @param {String} [name] The name of the element whose cache will be cleaned up. If it's absent the whole cache
         * will be dropped
         * @protected
         */
        _dropElemCache: function (name) {
            if (name) {
                delete this._cachedElements[this._getCacheKey.apply(this, arguments)];
            }
            else {
                this._cachedElements = {};
            }
            return this;
        },

        /**
         * Returns the data attribute value by the name of element described in {@link ElementsView#_selectors} or
         * {@link ElementsView#_classes} and the name of attribute itself. If you need data attributes of the root
         * element just use the {@link ElementsView#_data} property
         * @param {String} name The name of the searching element
         * @param {String} [attr] The attribute name, if it's absent all attributes will be returned as object
         * @returns {*|Object}
         * @protected
         */
        _getElemData: function (name, attr) {
            var data = this._elem(name).data();
            return attr ? data[attr] : data;
        }
    });

    return ElementsView;



View = ElementsView.extend({
    ns: default_ns,

    initialize: function (options) {
      this.setNS();
        console.log('View ----');
        console.log(options);

      ElementsView.prototype.initialize.call(this);

      options = options || {};
dcsdc
      this._page_components = {
        active: [],
        all: {}
      };

      if (options.init_components !== false) {
        this._initComponents();
      }
    },

    delegateEvents: function() {
      var parent_result = ElementsView.prototype.delegateEvents.apply(this, arguments),
          document_events = _.result(this, 'document_events', {});

      // повесим события на документ
      _.each(document_events, function(method, key) {
        var event_obj = key.split(' '),
            event_params = [];

        event_params.push(event_obj.shift() + this.ns + '.document');

        if (event_obj.length) {
          event_params.push(event_obj.join(' '));
        }

        event_params.push(_.bind(
          this[method],
          this
        ));

        this._has_global_events = !!event_params.length;
        this._$document.on.apply(
          this._$document,
          event_params
        );
      }, this);

      return parent_result;
    },

    undelegateEvents: function() {
      if (this._has_global_events) {
        this._$document.off(this.ns + '.document');
        this._has_global_events = void 0;
      }

      return ElementsView.prototype.undelegateEvents.apply(this, arguments);
    },

    destroy: function (complete_remove) {
      complete_remove = _.isUndefined(complete_remove) ? false : complete_remove;

      this._$document.off(this.ns);
      this._$window.off(this.ns);

      // удалим все используемые данной вьюхой компоненты
      this._page_components.active = _.filter(this._page_components.active, function (component) {
        this._destroyComponent(component, complete_remove);

        return false;
      }, this);

      this.remove(complete_remove);
    },

    setNS: function () {
      if (this.ns === default_ns) {
        this.ns = '.' + _.uniqueId('amo_view_');
      }
    },

    // инициализирует компоненты
    // вынесено в отдельный метод,
    // чтобы можно было использовать
    // в отрыве от метода `initialize`
    // базового компонента `Page`
    _initComponents: function () {
      var components;

      components = this.components && this.components.apply(this, arguments);

      // если компоненты переданы в служебном методе, то
      // инициализируем их автоматически
      _.each(components, function (args) {
        this._addComponent.apply(this, args);
      }, this);
    },

    // добавление компонента на страницу
    // `Component` - конструктор компонента
    // `params` - параметры компонента для инициализации
    _addComponent: function () {
      var Component, args, component, hash;

      if (!_.isFunction(arguments[0])) {
        throw new Error('First argument of a component must be a function');
      }

      Component = arguments[0];
      args = Array.prototype.slice.call(arguments, 1);
      component = this._initComponent(Component, args);
      hash = 'component_' + fn.randHex();

      // обернем `destroy`, чтобы
      // удалять из массива активных
      // компонентов при вызове метода
      // `_destroyComponent`
      if (_.isFunction(component.destroy)) {
        component.destroy = this._wrapComponentDestroy(component.destroy, this);
      }

      component.__page_component_hash = hash;

      this._page_components.active.push(component);
      this._page_components.all[hash] = {
        Component: Component,
        args: args
      };

      return component;
    },

    _wrapComponentDestroy: function (_destroy, context) {
      return _.wrap(_destroy, function (origDestroy) {
        var args = Array.prototype.slice.call(arguments, 1);

        origDestroy.apply(this, args);

        context._page_components.active = _.without(
          context._page_components.active,
          this
        );

        context._page_components.all = _.omit(
          context._page_components.all,
          this.__page_component_hash
        );
      });
    },

    // инициализация компонента с переданными параметрами
    _initComponent: function (Component, args) {
      args = [Component].concat(args || []);

      return new (Component.bind.apply(Component, args))();
    },

    // убивает компонент
    // если есть `destroy`, то вызывает его
    // иначе, если есть `remove`, то вызывает его
    _destroyComponent: function (component, complete_remove) {
      if (component && component.__page_component_hash) {
        if (_.isFunction(component.destroy)) {
          component.destroy(complete_remove);
        } else if (_.isFunction(component.remove)) {
          component.remove(complete_remove);
        }

        component = null;
      }

      return this;
    },

    // "временно" отключить компонент, на самом деле,
    // мы просто дестроим компонент, но потом его можно
    // включить обратно с помощью `_enableComponent`
    _disableComponent: function (component) {
      var active_index;

      if (component && component.__page_component_hash) {
        active_index = _.indexOf(this._page_components.active, component);

        this._destroyComponent(component);

        if (active_index !== -1) {
          this._page_components.active.splice(active_index, 1);
        }
      }

      return this;
    },

    // включаем компонент обратно, если выключали до этого
    _enableComponent: function (component) {
      var component_params;

      if (component &&
          component.__page_component_hash &&
          _.indexOf(this._page_components.active, component) === -1 // если компонент итак активен, то незачем его инициализировать повторно
      ) {
        component_params = this._page_components.all[component.__page_component_hash];
        component = this._initComponent(component_params.Component, component_params.args);
      }

      return this;
    }
  });

  return View;

  NotesView = View.extend({
    className: 'notes-wrapper',
    views: [],
    readers: null,
    _editing: null,
    _callbacks: {},
    _last_height: 0,
    _unseen_count: 0,

    _classes: function () {
      return {
        notes: 'js-notes',
        notes_scroller: 'notes-wrapper__scroller',
        tasks: 'js-tasks',
        tasks_wrapper: 'notes-wrapper__tasks',
        filter_and_chat_users: 'js-notes-filter-and-chat-users',
        feed_compose: 'feed-compose',
        green_line: 'js-green-line',
        plug: 'js-notes-plug',

        fixable: 'js-note-fixable',
        fixable_future: 'js-future-tasks-fixable',
        today_task: 'today',
        unseen_count: 'js-unseen-count'
      };
    },

    _selectors: function() {
      return {
        compose_scrollbar: '.notes-wrapper__compose-bottom, .feed-compose',
        typing_wrapper: '.notes-wrapper__typing'
      };
    },

    events: {
      'click .js-feed-load-more': 'loadMore',
      'click .js-unseen-count': '_scrollToEnd'
    },

    initialize: function (params) {

      View.prototype.initialize.apply(this, arguments);

      this.subscriptions = new Rx.CompositeDisposable();

      this.params = params || {};

      _.bindAll(this, '_onFileApiWindowOver');

      // очищаем массив вьюшек
      // при инициализации
      this.views = [];
      this._views_now = [];
      this.all_printing = {};
      this._page = 0;
      this._unseen_count = 0;

      // перепишем колбэки в свойство
      if (this.params.callbacks) {
        this._setCallbacks(this.params.callbacks);
      }

      if (this.params.class_name) {
        this.$el.addClass(this.params.class_name);
      }

      if (!this.params.no_player) {
        this._addComponent(Player, {
          append_to: '.feed-note-wrapper-call_in_out',
          afterSetPositions: function ($play_el, $player_el) {
            var el_position = $play_el.position();

            $player_el.css('width', '');

            $player_el.css({
              left: el_position.left + $play_el.width() / 2 - $player_el.width() / 2,
              top: el_position.top + $play_el.height() / 2 - $player_el.height() / 2
            });
          }
        });
      }

      this._filter = this._addComponent(NotesFilter, {
        element_type: this.params.element_type,
        getExtraData: _.bind(function() {
          var notes_collection = this.notes.findCollection(this.params.element_id);

          return this._getExtraData(notes_collection.first());
        }, this),
        onFilter: _.bind(this.loadMore, this, { reset: true })
      });

      this.initCollection({
        element_id: this.params.element_id,
        element_type: this.params.element_type,
        element_info: this.params.element_info
      });

      if (this.params.notes) {
        this.addNotes(this.params.notes, true);
      }

      // выход из режима редактирования
      // по клику мимо
      this._$document
        .on('click' + this.ns, '#save_and_close_contacts_link', _.bind(this._preventSaveOrCancel, this))
        .on('click' + this.ns, _.bind(this._saveOrCancelOnClick, this));

      FileAPI.event.dnd(window, this._onFileApiWindowOver, _.noop);

      if (this.params.element_id !== 0) {
        this._initAmoJoSocket();
      }

      this.read(_.bind(function (msg) {
        return msg.entity && msg.entity.id === this.params.element_id;
      }, this), this.params.element_id, account_sys.convertElementType(this.params.element_type, 'single'));
    },

    _getTwigTemplate: function() {
      var template;

      switch (AMOCRM.data.current_entity) {
        case 'unsorted':
          template = '/tmpl/unsorted/notes/wrapper.twig';
          break;

        default:
          template = '/tmpl/notes/wrapper.twig';
      }

      return template;
    },

    destroy: function () {
      FileAPI.event.dnd.off(window, this._onFileApiWindowOver, _.noop);

      View.prototype.destroy.apply(this, arguments);

      this.subscriptions.dispose();

      AMOCRM.inbox.removeReader(this.readers);
    },

    _onFileApiWindowOver: function(over) {
      if (!this._editing ||
          (this._editing && this._editing._active_view && !this._editing._opened)
      ) {
        this.notes.trigger('notes:dnd:compose', over);

        return;
      }

      switch (true) {
        case !_.isUndefined(this._editing) &&
             !_.isUndefined(this._editing._active_view):
          this._editing._active_view.model.trigger('notes:dnd:window', over);
          break;

        case !_.isUndefined(this._editing) &&
              _.isUndefined(this._editing._active_view):
          this._editing.model.trigger('notes:dnd:window', over);
          break;
      }
    },

    _toggleFilterAndTasksOnCompose: function (state) {
      var visibility = '';

      if (state === 'open') {
        visibility = 'hidden';
      }

      this._elem('tasks').css('visibility', visibility);
      this._elem('filter_and_chat_users').css('visibility', visibility);
    },

    /**
     * Подпишимся на соккет и будем слушать события
     * message_created, typing и message_delivery_status_changed
     * после чего проверим что эти события пришли в активный на данный момент чат
     * и запустим триггер для обработки этого события дальше
     */
    _initAmoJoSocket: function () {
      var socket_stream = AmoJoRTM.socket
            .map(function (msg) {
              return JSON.parse(msg.data);
            }),

          // пришло новое сообщение
          new_message_subscribe = socket_stream
            .filter(function (msg) { return msg.type === 'message_created'; })
            .map(function (msg) { return msg.data.message; })
            .filter(_.bind(function (msg) {
              var card_chats = AmoJoMediator.get();

              return card_chats[msg.chat_id] && !_.isEmpty(card_chats[msg.chat_id]);
            }, this)),

          // пришло событие тайпинга
          typing_subscribtion = socket_stream
            .filter(function (msg) { return msg.type === 'typing'; })
            .map(function (msg) { return msg.data; })
            .filter(_.bind(function (msg) {
              var card_chats = AmoJoMediator.get();

              return card_chats[msg.chat_id] && !_.isEmpty(card_chats[msg.chat_id]);
            }, this)),

          // произошло изменение статуса доставки
          status_message_subscribe = socket_stream
            .filter(function (msg) { return msg.type === 'message_delivery_status_changed'; })
            .map(function (msg) { return msg.data; })
            .filter(_.bind(function (msg) {
              var card_chats = AmoJoMediator.get();

              return card_chats[msg.chat_id] && !_.isEmpty(card_chats[msg.chat_id]);
            }, this));

      this.subscriptions.add(
        new_message_subscribe.subscribe(
          _.bind(function (message) {
            this.notes.trigger('add:from_socket', message);
          }, this),
          function(err) { throw err; }
        )
      );

      this.subscriptions.add(
        typing_subscribtion.subscribe(
          _.bind(function (message) {
            this.notes.trigger('add:typing:from_socket', message);
          }, this),
          function(err) { throw err; }
        )
      );

      this.subscriptions.add(
        status_message_subscribe.subscribe(
          _.bind(this._onChangeStatusMessage, this),
          function(err) { throw err; }
        )
      );
    },

    read: function(filter, id, type) {
      this.readers = AMOCRM.inbox.addReader(filter, id);

      if (type === 'unsorted') {
        AMOCRM.inbox.read({ entity_id: id.toString(), entity_type: type });
      } else {
        AMOCRM.inbox.read({ linked_entity_id: id.toString(), linked_entity_type: type });
      }
    },

    _setCallbacks: function (callbacks) {
      return _.extend(this._callbacks || {}, callbacks || {});
    },

    // инициализация коллекции,
    // добавляем необходимые обработчики событий
    initCollection: function (options) {
      this.notes = this._addComponent(PagerCollection, [], {
        element_type: options.element_type,
        element_id: options.element_id,
        element_info: options.element_info
      });

      this.notes
        .on('reset', this._resetViews, this)
        .on('fetched', this._addNotesAndScroll, this)
        .on('fetched', this._renderCustomersGreenBar, this)
        .on('sync note:view:update', this._onModelUpdate, this)
        .on('destroy note:view:destroy', this._onModelRemove, this)
        .on('add:from_socket', this._onAddAmojoView, this)
        .on('add:typing:from_socket', _.bind(this._onTypingFromSocket, this, 'lead'), this)
        .on('add', this._onSendExternalChatCloseFollowUp, this)
        .on('notes:update-sticky', _.bind(this._updateUnseen, this, 0), this);
    },

    /**
     * Метот который при новом событии изменении статуса доставки обновит модель
     *
     * @param  {Object} message аттрибуты модели сообщения
     */
    _onChangeStatusMessage: function (message) {
      var model_change = this.notes.get(message.id);

      model_change.set('delivery_status', message.delivery_status);
    },

    _onAddAmojoView: function (chat_message, options) {
      var repeated_message = _.find(this.notes.last(10), function (note) {
        return note.id === chat_message.id;
      }, this);

      this.removeTypingAfterSendMessage(chat_message.author);

      if (_.isUndefined(repeated_message)) {
        this.notes.add(chat_message);

        this.addNotes(chat_message, options)
          .then(
            _.bind(this._updateUnseen, this, 1)
          );
      }
    },

    // проверим нужно ли подскролить страницу при появлении
    // тайпинга и вызовем рендер тайпинга
    scrollFromTyping: function () {
      var current_st = this._elem('notes_scroller').scrollTop(),
          height_wrapper = this._elem('notes_scroller')[0].offsetHeight,
          scrollToEnd = this._last_height === current_st + height_wrapper;

      return _.bind(function() {
        if (scrollToEnd) {
          this._scrollToEnd();
        }
      }, this);
    },

    _getComposeView: function () {
      switch (AMOCRM.getBaseEntity()) {
        case 'unsorted':
          return UnsortedComposeView;

        default:
          return ComposeView;
      }
    },

    _setFullyLoaded: function () {
      var CurrentComposeView = this._getComposeView();

      this._scrollToEnd();

      this.notes.trigger('notes:update-sticky');
      this.notes.setFullyLoaded(true);
      this.notes.trigger('views:tasks:autosize');

      if (this.params.can_add) {
        this._compose = this._addComponent(CurrentComposeView, {
          el: this.$('.feed-compose'),
          notes: this.notes,
          $notes_scroller: this._elem('notes_scroller'),

          onToggle: _.bind(this._toggleFilterAndTasksOnCompose, this),

          setEdit: _.bind(this._setEdit, this),
          addNotes: _.bind(this._addNotes, this),
          getResponsibleId: _.bind(this.params.getResponsibleId, this),
          getExtraData: _.bind(this._getExtraData, this),
          scrollToEnd: _.bind(this._scrollToEnd, this),
          hide_users_list: !!this.params.hide_users_list
        });
      }

      this._addComponent(Autoload, {
        element: this._elem('notes_scroller').get(0),
        conditions: { 'max-top': 300 },
        throttle: 300,
        onLoadMore: _.bind(this.loadMore, this)
      });

      this._scrollAutoMargin();
    },

    _preventSaveOrCancel: function (e) {
      e.stopPropagation();

      this._$document.trigger('controls:hide');
    },

    _saveOrCancelOnClick: function (e) {
      if (e.button === 2 ||
          !this._editing ||
          !this._editing._editing
      ) {
        return;
      }

      // если есть изменения
      if (this._editing.hasChanges()) {
        this._editing.save()
          .then(_.bind(function () {
            this._editing = null;
          }, this));
      } else {
        this._editing = this._editing.cancel() || null;
      }
    },

    _getMainEntity: function() {
      if (_.isFunction(this.params.getMainEntity)) {
        return this.params.getMainEntity();
      }

      return {
        id: this.notes.element_id,
        element_type: this.notes.element_type
      };
    },

    _getLinkedEntities: function () {
      if (_.isFunction(this.params.getLinkedEntities)) {
        return this.params.getLinkedEntities();
      }

      return {};
    },

    _collectEmailsFromCF: function (model_attributes) {
      if (_.isFunction(this.params.collectEmailsFromCF)) {
        return this.params.collectEmailsFromCF(model_attributes);
      }

      return [];
    },

    // обработчик запроса на редактирование
    // так как у нас в один момент времени
    // в режиме редактирования может быть
    // только 1 форма, здесь мы как раз это
    // и проверяем
    _setEdit: function (view) {
      if (this._editing &&
          this._editing.hasChanges()
      ) {
        this._editing.save()
          .then(_.bind(function (args) {
            this._editing = null;

            this._setEdit.apply(this, args);
          }, this, arguments));

        return;
      }

      if (this._editing) {
        this._editing.cancel();
      }

      this._editing = view;
      this._editing.edit();

      // внешние обработчики
      if (this._callbacks.onChange &&
          this._callbacks.onRevert &&
          this._editing._form &&
          !this._editing.not_check_changes // флаг, который говорит, что не нужно следить за изменениями вьюшки
      ) {
        this._editing._form.model
          .on('has_changes', this._callbacks.onChange)
          .on('has_reverted', this._callbacks.onRevert);
      }
    },

    // при удалении элемента
    // надо актуализировать
    // список вьюшек
    _onModelRemove: function (model, options) {
      options = options || {};

      this._resort(
        _.filter(this.views, function (filtering) {
          return !_.find(filtering.view.models, function(m) {
            return m === model;
          });
        })
      );

      // в некоторых случаях
      // нужно реагировать именно
      // на обноавление вьюшек, а
      // не удаление модели из коллекции
      // поэтому здесь кастомный триггер
      if (!options.silent) {
        this.notes.trigger('view:removed', model);
      }
    },

    // при синхронизации модели с сервером
    // обновим сортировку, так как при
    // редактировании задачи ее дата может
    // измениться и она должна попасть
    // в нужное место таймлайна
    _onModelUpdate: function (model) {
      var date;

      if (model === this.notes) {
        return;
      }

      date = this._getItemDate(model.toJSON());

      _.each(this.views, function (updating) {
        if (updating.view.model === model && !model._pending) {
          updating.date = date;

          // если мы завершили задачу,
          // то надо переместить ее
          // в контейнер примечаний
          if (this._isFutureTask(model)) {
            this._elem('tasks').prepend(updating.view.el);
          } else {
            this._elem('notes').prepend(updating.view.el);
          }
        }
      }, this);

      if (this._elem('tasks').is(':empty')) {
        this._elem('tasks_wrapper').addClass('empty');
      } else {
        this._elem('tasks_wrapper').removeClass('empty');

        this._checkTodayTasks();
      }

      this._resort();
    },

    // постраничка
    loadMore: function (options) {
      if (this.notes._pending ||
         !this.notes.element_id
      ) {
        return;
      }

      options = options || {};

      this.$el.addClass('loading-more');

      if (options.reset) {
        this._page = 0;
      }

      this.notes
        .fetch({
          page: this._page + 1,
          reset: options.reset,
          filter: this._filter.get(),
          silent: options.silent
        })
        .then(_.bind(function (response) {
          // если не пришел ответ
          // после фетча, то надо
          // скрыть кнопку, иначе
          // она не скроется, так
          // как ни один элемент
          // не будет добавлен
          if (!response) {
            this._toggleLoadMoreButton();
          }

          this._page++;

          this.$el.removeClass('loading-more');
        }, this));
    },

    addNotes: function(notes, options) {
      return new Promise(_.bind(function (resolve) {
        return twig._preload(['/tmpl/cards/notes/wrapper.twig'])()
          .then(_.bind(this._addNotes, this, notes, options))
          .then(resolve);
      }, this));
    },

    // метод, с помощью которого можно
    // добавить новые примечания в список
    _addNotes: function (notes, options) {
      options = options || {};

      if (!_.isArray(notes)) {
        notes = [notes];
      }

      notesReducers.process(notes, {
        element_id: this.notes.element_id,
        element_type: this.notes.element_type,
        exclude_reducers: options.exclude_reducers || [],

        renderView: _.bind(this.renderView, this)
      });

      return this.renderViews(options);
    },

    // метод срабатывает после получения
    // данных с бэка, отправляет данные
    // на рендер и ждет, пока все отрендерится
    // чтобы проскроллить к нужной позиции
    _addNotesAndScroll: function (notes) {
      this.addNotes(notes, {
        update_scroll_delta: true
      });

      this._scrollAutoMargin();
    },

    // в некоторых случаях, например,
    // после добавления новых примечания/задачи
    // модель может уже находиться в
    // коллекции, чтобы ее успеть
    // подсунуть в форму при сохранении
    // поэтому нужно сначала попытаться
    // найти по `id` ее в коллекции
    // и если ничего не найдется, то
    // добавить, как новую
    _addToCollection: function(items) {
      return _.map(items, function (note) {
        if (this.notes.get(note.id)) {
          return this.notes.get(note.id);
        }

        return this.notes.add(note);
      }, this);
    },

    renderView: function (items, view_type) {
      var ViewComponent,
          item,
          models,
          date,
          options = {
            // дадим возможность вьюшке добавлять
            // новые примечания через колбэк
            onAdd: _.bind(this._addNotes, this),
            addToCollection: _.bind(this._addToCollection, this)
          };

      items = _.isArray(items) ? items : [items];
      date = this._getItemDate(_.last(items));

      ViewComponent = getComplexView(items[0], view_type);

      // сформируем модели из входных данных
      models = this._addToCollection(items);

      item = {
        date: date,
        view: this._addComponent(ViewComponent, _.extend({
          element_id: this.notes.element_id,
          element_type: this.notes.element_type,

          models: models,
          onDestroy: _.bind(this._onNoteViewDestroy, this),
          onEdit: _.bind(this._setEdit, this),
          getOriginCollection: _.bind(this.notes.getOriginCollection, this.notes),
          getExtraData: _.bind(this._getExtraData, this),
          scrollUpdate: _.bind(this._scrollUpdate, this),
          scrollToEnd: _.bind(this._scrollToEnd, this),
          scrollToEl: _.bind(this._scrollToEl, this)
        }, options))
      };

      this._views_now.push(item);
      this.views.push(item);
    },

    render: function (options) {
      var template = this._getTwigTemplate();

      return twig._preload([template])()
        .then(_.bind(this._render, this, options));
    },

    _render: function (options) {
      var template = this._getTwigTemplate(),
          $notes = $(twig({ ref: template }).render(
            _.extend(options || {}, {
              element_type: this.notes.element_type,
              is_add_mode: !this.notes.element_id,
              is_free_user: AMOCRM.constant('user_rights').is_free_user,
              is_chat_enabled: _.indexOf(CHAT_ELEMENT_TYPES, this.notes.element_type) !== -1,
              entity_type: AMOCRM.data.current_entity,
              last_used_type: this.getLastUsedType()
            })
          ));

      this._toggleLoadMoreButton();
      this.el.innerHTML = $notes.html();

      this._elem('filter_and_chat_users')
        .children('div')
        .append(this._filter.el);

      this._initStacking();
    },

    getLastUsedType: function() {
      var last_used_type = Fn.storeWithExpiration.get(constants.LS_LAST_TYPE);

      if (_.indexOf(['contacts', 'companies'], AMOCRM.getBaseEntity()) !== -1 || !this.notes.element_id) {
        last_used_type = 'note';
      }

      return last_used_type;
    },

    renderViews: function(options) {
      return new Promise(_.bind(function (resolve) {
        return twig._preload([this._getTwigTemplate()])()
          .then(_.bind(this._renderViews, this, options))
          .then(resolve);
      }, this));
    },

    // рендерит вьюшки, добавленные
    // через `addNotes` и запускает
    // пересортировку
    _renderViews: function (options) {
      var notes_frag = document.createDocumentFragment(),
          tasks_frag = document.createDocumentFragment(),
          views = this._sortAlgo(this._views_now, this.notes.element_type),
          has_tasks = 0,
          scrollUpdate = this._scrollUpdate();

      options = options || {};

      this._views_now = [];

      _.each(views, function (item, index, items) {
        if (item.view.model.get('hide_in_feed')) {
          return;
        }

        item.view._render();

        if (this._isFutureTask(item.view.model)) {
          tasks_frag.appendChild(item.view.el);
          has_tasks++;
        } else {
          notes_frag.appendChild(item.view.el);
        }
      }, this);

      this.el.querySelector(this._selector('tasks')).appendChild(tasks_frag);
      this.el.querySelector(this._selector('notes')).appendChild(notes_frag);

      if (has_tasks) {
        this._elem('tasks_wrapper')
          .removeClass('empty');

        this._checkTodayTasks();
      }

      this._resort();
      this.notes.trigger('views:added', views);
      scrollUpdate(options.update_scroll_delta);

      this._toggleLoadMoreButton();
      this._filter.updateState();

      return new Promise(_.bind(function (resolve) {
        return resolve();
      }, this));
    },

    _scrollAutoMargin: function () {
      var $feed_compose = this.$(this._selector('compose_scrollbar')),
          right_value;

      if (parseInt($feed_compose.attr('data-scroll-calc')) !== 1) {
        right_value = parseInt($feed_compose.css('right'));

        $feed_compose
          .css(
            'right',
            right_value + Fn.getScrollBarWidth('custom-scroll')
          );

        if (right_value) {
          $feed_compose
            .attr('data-scroll-calc', 1);
        }
      }
    },

    _resetViews: function() {
      this.views = _.reject(this.views, function(view) {
        view.view.destroy(true);

        return true;
      });

      this._resort();
      this._setLastHeight();
    },

    _scrollToEnd: function () {
      this._elem('notes_scroller').scrollTop(
        this._elem('notes_scroller')[0].scrollHeight
      );
    },

    _scrollUpdate: function () {
      var current_st = this._elem('notes_scroller').scrollTop();

      return _.bind(function(update_scroll_delta) {
        var container_height = this._elem('notes_scroller')[0].scrollHeight,
            delta = 0;

        if (update_scroll_delta ||
            this._last_height === current_st + this._elem('notes_scroller')[0].offsetHeight
        ) {
          delta = container_height - this._last_height;
        }

        this._findElem('plug').remove();

        this._elem('notes_scroller')
          .scrollTop(current_st + delta);

        this._setLastHeight();
        this._scrollAutoMargin();
      }, this);
    },

    _scrollToEl: function($el) {
      var scroll_top = this._elem('notes_scroller').scrollTop(),
          el_top = $el.position().top;

      this._elem('notes_scroller').scrollTop(
        scroll_top + el_top
      );

      this._setLastHeight();
    },

    _setLastHeight: function() {
      this._last_height = this._elem('notes_scroller')[0].scrollHeight;
    },

    _onScroll: function(scroll_top, max_scroll_top) {
      var filter_offset = this._elem('filter_and_chat_users').height();

      if (scroll_top >= max_scroll_top - filter_offset) {
        this._setUnseen(0);
      }
    },

    _toggleLoadMoreButton: function () {
      var has_next_page = this.notes.hasNextPage();

      // после рендеринга надо
      // либо показать кнопку загрузки
      // элементов, либо ее скрыть
      this.el.classList[has_next_page ? 'remove' : 'add']('reached-end');

      // если нет больше страниц,
      // то надо совсем скрыть кнопку
      _.delay(_.bind(function () {
        if (has_next_page) {
          this.$('.js-feed-load-more').show();
        } else {
          this.$('.js-feed-load-more').hide();
        }
      }, this), 100);
    },

    // методы, которые работают только
    // для режима `timeline`, в сделке
    // реализованы в миксине `TimelineMixin`
    _stopTimeline: _.noop,
    _startTimeline: _.noop,
    _updateTimeline: _.noop,

    // зеленая плашка покупателя
    // реализовано в миксине `CustomersGreenBar`
    _renderCustomersGreenBar: _.noop,
    _onCustomersGreenLineOutside: _.noop,

    // фиксация задач и примечаний
    // реализовано в миксине `StackingMixin`
    _initStacking: _.noop,

    _resort: function (views) {
      this.views = this._sortAlgo(views || this.views, this.notes.element_type);

      // у будущих задач уберем костыльный класс
      this._elem('tasks').removeClass('editing');

      this._stopTimeline();

      this._updateViewsSort(true);
      this._updateViewsSort(false);

      this._startTimeline();

      this.notes.trigger('notes:update-sticky');
    },

    _updateViewsSort: function (is_future_task) {
      var last_view,
          views = this.views;

      _.each(views, function (view) {
        if (this._isFutureTask(view.view.model) === is_future_task ||
            view.view.model._pending
        ) {
          return;
        }

        if (last_view &&
            last_view.nextSibling !== view.view.el
        ) {
          last_view.parentNode.insertBefore(view.view.el, last_view.nextSibling);
        }

        last_view = view.view.el;
      }, this);
    },

    _isFutureTask: function (note_model) {
      var comlete_timestamp = this._getItemDate(note_model.toJSON()),
          current_timestamp = moment().tz(AMOCRM.system.timezone);

      return note_model.get('object_type').code === 'tasks' &&
            !note_model.get('status') &&
             comlete_timestamp > current_timestamp.unix();
    },

    /**
     * @description Если в данный момент открыто
     * примечание и оно не сохранено, то сохраним его
     * @param {function} resolve
     * @param {function} reject
     * @private
     */
    _checkEditing: function (resolve, reject) {
      if (this._editing &&
          this._editing.hasChanges() &&
          (!_.isFunction(this._editing.isSaved) || !this._editing.isSaved())
      ) {
        this._editing.save()
          .then(resolve, reject);
      } else {
        resolve();
      }
    },

    save: function () {
      return new Promise(_.bind(function (resolve, reject) {
        this._checkEditing(resolve, reject);
      }, this));
    },

    saveUnsaved: function () {
      var promises = [];

      this.notes.each(function (model) {
        var promise;

        if (!model.get('id')) {
          promise = new Promise(function (resolve) {
            model.save({ success: resolve });
          });

          promises.push(promise);
        }
      });

      return promises.length ? null : Promise.all(promises);
    },

    setMainId: function (element_id) {
      if (!this.params.element_id) {
        this.params.element_id = element_id;
        this.notes.setMainId(element_id);

        if (this._compose && _.isFunction(this._compose.setMainId)) {
          this._compose.setMainId(element_id);
        }
      }
    },

    _getExtraData: function (model) {
      var collection,
          embedded,
          output_data;

      switch (true) {
        case !model:
          output_data = {
            elements: [this._getMainEntity()].concat(this._getLinkedEntities()),
            chats: AmoJoMediator.get()
          };
          break;

        default:
          collection = this.notes.getOriginCollection(model);
          embedded = collection ? collection.embedded || {} : {};

          output_data = {
            leads: embedded.leads || {},
            customers: embedded.customers || {},
            transactions: embedded.transactions || {},
            contacts: embedded.contacts || {},
            companies: embedded.companies || {},
            types: embedded.types || {},
            users: embedded.account ? embedded.account._embedded.users : {},
            statuses: embedded.account ? embedded.account._embedded.status_pipeline : {},
            pipelines: embedded.account ? embedded.account._embedded.pipelines : {},
            loss_reasons: ut.hasKeys(embedded, ['account', '_embedded', 'loss_reasons'])
              ? embedded.account._embedded.loss_reasons
              : {}
          };
      }

      return _.extend(output_data, this.params.unsorted_data || {});
    },

    _onNoteViewDestroy: function (view) {
      if (this._elem('tasks').is(':empty')) {
        this._elem('tasks').removeClass('today');
        this._elem('tasks_wrapper').addClass('empty');
      }

      this.notes.trigger('notes:view-destroy', view);
    },

    // если пользователь пишет во внешний чат
    // и при этом у него стоит задача follow-up,
    // то предлагать закрыть задачу
    _onSendExternalChatCloseFollowUp: function(model) {
      var external_chat, follow_up;

      // обрабатываем только сообщения чатов
      if (!model.get('chat_id')) {
        return;
      }

      external_chat = _.find(this._getExtraData().chats || {}, function(chat) {
        var author = model.get('author');

        return chat.chat_id === model.get('chat_id') &&
               author.id === account_users.current('amojo_id') &&
               parseInt(chat.entity_type) === AMOCRM.element_types.contacts;
      });

      follow_up = this.notes.find(function(note) {
        var object_type = note.get('object_type') || {};

        return object_type.code === 'tasks' &&
              !note.get('status') &&
               parseInt(note.get('type')) === 1 &&
               parseInt(note.get('responsible_user')) === parseInt(account_users.current('id'));
      });

      if (external_chat && follow_up) {
        follow_up.trigger('task:complete-after-chat');
      }
    },

    _checkTodayTasks: function() {
      var tasks_els = this._elem('tasks').children();

      if (tasks_els.length === 1 &&
          tasks_els[0].querySelector(this._selector('today_task'))
      ) {
        this._elem('tasks').addClass('today');
      } else {
        this._elem('tasks').removeClass('today');
      }
    },

    _updateUnseen: function(count) {
      var scroll_top = this._elem('notes_scroller').scrollTop(),
          scroll_height = this._elem('notes_scroller').get(0).scrollHeight,
          offset_height = this._elem('notes_scroller').get(0).offsetHeight,
          scroll_offset = scroll_height - (offset_height + scroll_top),
          bottom = '';

      count = this._unseen_count + (_.isNumber(count) ? count : 1);

      this._elem('unseen_count').get(0).style.bottom = '';

      if (scroll_offset >= this._elem('filter_and_chat_users').height() &&
          count > 0
      ) {
        this._unseen_count = count;

        this._elem('unseen_count')
          .html(this._unseen_count);

        if (this._elem('tasks').is(':visible')) {
          bottom = parseInt(getComputedStyle(this._elem('tasks').get(0)).bottom) +
                   this._elem('tasks').get(0).offsetHeight +
                   15;
        }

        this._elem('unseen_count')
          .css({
            right: Fn.getScrollBarWidth('custom-scroll'),
            bottom: bottom
          });
      } else {
        this._unseen_count = 0;

        this._elem('unseen_count')
          .html('');
      }
    },

    _setUnseen: function(count) {
      this._unseen_count = count;
      this._updateUnseen(0);
    },

    // методы, которые остались
    // для старых вещей `dropbox`, etc
    createModel: function (type, data) {
      var params = {};

      return _.extend({
        type: type || 'system_note',
        object_type: {
          code: 'notes'
        },
        date_create: data.date,
        element_type: this.notes.element_type,
        element_id: this.notes.element_id
      }, data || {}, params);
    },

    _add: function (note) {
      if (!_.isArray(note)) {
        note = [note];
      }

      return this.addNotes(note);
    }
  });

  Cocktail.mixin(
    NotesView,
    SortingMixin,
    TypingMixin,
    TimelineMixin,
    CustomersGreenBar,
    StackingMixin,
    ImagesPreviewMixin,
    ClosedStatusChangeMixin,
    FirstTaskMixin
  );

  return NotesView;

