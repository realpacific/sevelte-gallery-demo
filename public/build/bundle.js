(function (l, r) {
    if (l.getElementById('livereloadscript')) return;
    r = l.createElement('script');
    r.async = 1;
    r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1';
    r.id = 'livereloadscript';
    l.head.appendChild(r)
})(window.document);
var app = (function () {
    'use strict';

    function noop() {
    }

    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }

    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: {file, line, column, char}
        };
    }

    function run(fn) {
        return fn();
    }

    function blank_object() {
        return Object.create(null);
    }

    function run_all(fns) {
        fns.forEach(run);
    }

    function is_function(thing) {
        return typeof thing === 'function';
    }

    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }

    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }

    function detach(node) {
        node.parentNode.removeChild(node);
    }

    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }

    function element(name) {
        return document.createElement(name);
    }

    function text(data) {
        return document.createTextNode(data);
    }

    function space() {
        return text(' ');
    }

    function empty() {
        return text('');
    }

    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }

    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }

    function children(element) {
        return Array.from(element.childNodes);
    }

    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;

    function set_current_component(component) {
        current_component = component;
    }

    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;

    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }

    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }

    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }

    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    const outroing = new Set();
    let outros;

    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }

    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }

    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};

        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                info.blocks[i] = null;
                            });
                            check_outros();
                        }
                    });
                } else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }

        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        } else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }

    function create_component(block) {
        block && block.c();
    }

    function mount_component(component, target, anchor) {
        const {fragment, on_mount, on_destroy, after_update} = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            } else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }

    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }

    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }

    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            } else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }

    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }

        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }

        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }

    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", {target, node});
        append(target, node);
    }

    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", {target, node, anchor});
        insert(target, node, anchor);
    }

    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", {node});
        detach(node);
    }

    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", {node, event, handler, modifiers});
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", {node, event, handler, modifiers});
            dispose();
        };
    }

    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", {node, attribute});
        else
            dispatch_dev("SvelteDOMSetAttribute", {node, attribute, value});
    }

    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }

        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    class Asset {

        constructor(author, width, height, url, downloadUrl) {
            this.author = author;
            this.width = width;
            this.height = height;
            this.url = url;
            this.downloadUrl = downloadUrl;
        }
    }

    /* src\Gallery.svelte generated by Svelte v3.16.5 */

    const file = "src\\Gallery.svelte";

    function create_fragment(ctx) {
        let main;
        let div;
        let img;
        let img_src_value;
        let img_alt_value;
        let dispose;

        const block = {
            c: function create() {
                main = element("main");
                div = element("div");
                img = element("img");
                if (img.src !== (img_src_value = /*asset*/ ctx[0].downloadUrl)) attr_dev(img, "src", img_src_value);
                attr_dev(img, "alt", img_alt_value = /*asset*/ ctx[0].author);
                attr_dev(img, "class", "svelte-z6dlzv");
                add_location(img, file, 12, 8, 195);
                attr_dev(div, "class", "card svelte-z6dlzv");
                add_location(div, file, 11, 4, 167);
                attr_dev(main, "class", "col-4 svelte-z6dlzv");
                add_location(main, file, 10, 0, 125);
                dispose = listen_dev(main, "click", /*open*/ ctx[1], false, false, false);
            },
            l: function claim(nodes) {
                throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
            },
            m: function mount(target, anchor) {
                insert_dev(target, main, anchor);
                append_dev(main, div);
                append_dev(div, img);
            },
            p: function update(ctx, [dirty]) {
                if (dirty & /*asset*/ 1 && img.src !== (img_src_value = /*asset*/ ctx[0].downloadUrl)) {
                    attr_dev(img, "src", img_src_value);
                }

                if (dirty & /*asset*/ 1 && img_alt_value !== (img_alt_value = /*asset*/ ctx[0].author)) {
                    attr_dev(img, "alt", img_alt_value);
                }
            },
            i: noop,
            o: noop,
            d: function destroy(detaching) {
                if (detaching) detach_dev(main);
                dispose();
            }
        };

        dispatch_dev("SvelteRegisterBlock", {
            block,
            id: create_fragment.name,
            type: "component",
            source: "",
            ctx
        });

        return block;
    }

    function instance($$self, $$props, $$invalidate) {
        let {asset} = $$props;

        function open() {
            window.open(asset.url, "_blank");
        }

        const writable_props = ["asset"];

        Object.keys($$props).forEach(key => {
            if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Gallery> was created with unknown prop '${key}'`);
        });

        $$self.$set = $$props => {
            if ("asset" in $$props) $$invalidate(0, asset = $$props.asset);
        };

        $$self.$capture_state = () => {
            return {asset};
        };

        $$self.$inject_state = $$props => {
            if ("asset" in $$props) $$invalidate(0, asset = $$props.asset);
        };

        return [asset, open];
    }

    class Gallery extends SvelteComponentDev {
        constructor(options) {
            super(options);
            init(this, options, instance, create_fragment, safe_not_equal, {asset: 0});

            dispatch_dev("SvelteRegisterComponent", {
                component: this,
                tagName: "Gallery",
                options,
                id: create_fragment.name
            });

            const {ctx} = this.$$;
            const props = options.props || ({});

            if (/*asset*/ ctx[0] === undefined && !("asset" in props)) {
                console.warn("<Gallery> was created without expected prop 'asset'");
            }
        }

        get asset() {
            throw new Error("<Gallery>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
        }

        set asset(value) {
            throw new Error("<Gallery>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
        }
    }

    /* src\App.svelte generated by Svelte v3.16.5 */
    const file$1 = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
        const child_ctx = ctx.slice();
        child_ctx[3] = list[i];
        return child_ctx;
    }

    // (24:8) {:catch error}
    function create_catch_block(ctx) {
        let p;
        let t0;
        let t1_value = /*error*/ ctx[2] + "";
        let t1;

        const block = {
            c: function create() {
                p = element("p");
                t0 = text("An error occurred! ");
                t1 = text(t1_value);
                add_location(p, file$1, 24, 12, 817);
            },
            m: function mount(target, anchor) {
                insert_dev(target, p, anchor);
                append_dev(p, t0);
                append_dev(p, t1);
            },
            p: noop,
            i: noop,
            o: noop,
            d: function destroy(detaching) {
                if (detaching) detach_dev(p);
            }
        };

        dispatch_dev("SvelteRegisterBlock", {
            block,
            id: create_catch_block.name,
            type: "catch",
            source: "(24:8) {:catch error}",
            ctx
        });

        return block;
    }

    // (20:8) {:then data}
    function create_then_block(ctx) {
        let each_1_anchor;
        let current;
        let each_value = /*data*/ ctx[1];
        let each_blocks = [];

        for (let i = 0; i < each_value.length; i += 1) {
            each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
        }

        const out = i => transition_out(each_blocks[i], 1, 1, () => {
            each_blocks[i] = null;
        });

        const block = {
            c: function create() {
                for (let i = 0; i < each_blocks.length; i += 1) {
                    each_blocks[i].c();
                }

                each_1_anchor = empty();
            },
            m: function mount(target, anchor) {
                for (let i = 0; i < each_blocks.length; i += 1) {
                    each_blocks[i].m(target, anchor);
                }

                insert_dev(target, each_1_anchor, anchor);
                current = true;
            },
            p: function update(ctx, dirty) {
                if (dirty & /*fetchAssets*/ 1) {
                    each_value = /*data*/ ctx[1];
                    let i;

                    for (i = 0; i < each_value.length; i += 1) {
                        const child_ctx = get_each_context(ctx, each_value, i);

                        if (each_blocks[i]) {
                            each_blocks[i].p(child_ctx, dirty);
                            transition_in(each_blocks[i], 1);
                        } else {
                            each_blocks[i] = create_each_block(child_ctx);
                            each_blocks[i].c();
                            transition_in(each_blocks[i], 1);
                            each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
                        }
                    }

                    group_outros();

                    for (i = each_value.length; i < each_blocks.length; i += 1) {
                        out(i);
                    }

                    check_outros();
                }
            },
            i: function intro(local) {
                if (current) return;

                for (let i = 0; i < each_value.length; i += 1) {
                    transition_in(each_blocks[i]);
                }

                current = true;
            },
            o: function outro(local) {
                each_blocks = each_blocks.filter(Boolean);

                for (let i = 0; i < each_blocks.length; i += 1) {
                    transition_out(each_blocks[i]);
                }

                current = false;
            },
            d: function destroy(detaching) {
                destroy_each(each_blocks, detaching);
                if (detaching) detach_dev(each_1_anchor);
            }
        };

        dispatch_dev("SvelteRegisterBlock", {
            block,
            id: create_then_block.name,
            type: "then",
            source: "(20:8) {:then data}",
            ctx
        });

        return block;
    }

    // (21:12) {#each data as asset}
    function create_each_block(ctx) {
        let current;

        const gallery = new Gallery({
            props: {
                class: "gallery",
                asset: /*asset*/ ctx[3]
            },
            $$inline: true
        });

        const block = {
            c: function create() {
                create_component(gallery.$$.fragment);
            },
            m: function mount(target, anchor) {
                mount_component(gallery, target, anchor);
                current = true;
            },
            p: noop,
            i: function intro(local) {
                if (current) return;
                transition_in(gallery.$$.fragment, local);
                current = true;
            },
            o: function outro(local) {
                transition_out(gallery.$$.fragment, local);
                current = false;
            },
            d: function destroy(detaching) {
                destroy_component(gallery, detaching);
            }
        };

        dispatch_dev("SvelteRegisterBlock", {
            block,
            id: create_each_block.name,
            type: "each",
            source: "(21:12) {#each data as asset}",
            ctx
        });

        return block;
    }

    // (18:28)              <p>Waiting...</p>         {:then data}
    function create_pending_block(ctx) {
        let p;

        const block = {
            c: function create() {
                p = element("p");
                p.textContent = "Waiting...";
                add_location(p, file$1, 18, 12, 630);
            },
            m: function mount(target, anchor) {
                insert_dev(target, p, anchor);
            },
            p: noop,
            i: noop,
            o: noop,
            d: function destroy(detaching) {
                if (detaching) detach_dev(p);
            }
        };

        dispatch_dev("SvelteRegisterBlock", {
            block,
            id: create_pending_block.name,
            type: "pending",
            source: "(18:28)              <p>Waiting...</p>         {:then data}",
            ctx
        });

        return block;
    }

    function create_fragment$1(ctx) {
        let link;
        let t;
        let main;
        let div;
        let promise;
        let current;

        let info = {
            ctx,
            current: null,
            token: null,
            pending: create_pending_block,
            then: create_then_block,
            catch: create_catch_block,
            value: 1,
            error: 2,
            blocks: [, , ,]
        };

        handle_promise(promise = /*fetchAssets*/ ctx[0], info);

        const block = {
            c: function create() {
                link = element("link");
                t = space();
                main = element("main");
                div = element("div");
                info.block.c();
                attr_dev(link, "rel", "stylesheet");
                attr_dev(link, "href", "https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css");
                add_location(link, file$1, 12, 4, 422);
                attr_dev(div, "class", "row");
                add_location(div, file$1, 16, 4, 571);
                attr_dev(main, "class", "container");
                add_location(main, file$1, 15, 0, 542);
            },
            l: function claim(nodes) {
                throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
            },
            m: function mount(target, anchor) {
                append_dev(document.head, link);
                insert_dev(target, t, anchor);
                insert_dev(target, main, anchor);
                append_dev(main, div);
                info.block.m(div, info.anchor = null);
                info.mount = () => div;
                info.anchor = null;
                current = true;
            },
            p: function update(new_ctx, [dirty]) {
                ctx = new_ctx;

                {
                    const child_ctx = ctx.slice();
                    child_ctx[1] = info.resolved;
                    info.block.p(child_ctx, dirty);
                }
            },
            i: function intro(local) {
                if (current) return;
                transition_in(info.block);
                current = true;
            },
            o: function outro(local) {
                for (let i = 0; i < 3; i += 1) {
                    const block = info.blocks[i];
                    transition_out(block);
                }

                current = false;
            },
            d: function destroy(detaching) {
                detach_dev(link);
                if (detaching) detach_dev(t);
                if (detaching) detach_dev(main);
                info.block.d();
                info.token = null;
                info = null;
            }
        };

        dispatch_dev("SvelteRegisterBlock", {
            block,
            id: create_fragment$1.name,
            type: "component",
            source: "",
            ctx
        });

        return block;
    }

    function instance$1($$self) {
        const fetchAssets = (async function () {
            const response = await fetch(`https://picsum.photos/v2/list?page=1&limit=30`);
            const body = await response.json();
            return body.map(res => new Asset(res["author"], res["width"], res["height"], res["url"], res["download_url"]));
        })();

        $$self.$capture_state = () => {
            return {};
        };

        $$self.$inject_state = $$props => {

        };

        return [fetchAssets];
    }

    class App extends SvelteComponentDev {
        constructor(options) {
            super(options);
            init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

            dispatch_dev("SvelteRegisterComponent", {
                component: this,
                tagName: "App",
                options,
                id: create_fragment$1.name
            });
        }
    }

    const app = new App({
        target: document.body,
        props: {}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
