/**
 * 使用 window.name 来无刷新跨域 post 数据，包括 file input
 *
 * @param {String} url the url of the page which request.
 * @param {Function} callback the function which handle the response, the response is window.name; if fail, set it to {error: 1}.
 * @param {Object} [options] optional data, including following items
 *      params: a key-value data to be send
 *      files: an array contains with file input element to be send
 *      localProxy: the local proxy file, if not set, use '/favicon.ico'.
 *
 * @example
 *
 *  // this will use window.name
 *  var t = new Transfer('http://127.0.0.1/action.php', function(data) {
 *          console.log(data);
 *      },
 *      {
 *          params: {'key': 'happy'}
 *      }
 *  );
 *  t.send();
 */


function Transfer(url, callback, options) {
    this.url = url;
    this.callback = callback;

    var op = {
        localProxy: '/favicon.ico',
        defaultName: 'cross.default.name'
    };
    this.options = this.extend(op, options);

    this.init();
}


Transfer.prototype = {
    init: function() {
        // ============ helper functions
        function createNamedElement(type, name) {
            var element = null;
            // Try the IE way; this fails on standards-compliant browsers
            try {
                element = document.createElement('<' + type + ' name="' + name + '">');
            } catch (e) {
            }
            if (!element || element.nodeName != type.toUpperCase()) {
                // Non-IE browser; use canonical method to create named element
                element = document.createElement(type);
                element.name = name;
            }
            return element;
        }
        // ============

        // add windowname mark
        this.params = this.options.params || {};
        this.params.windowname = 1;
        delete this.options.params;

        this.files = this.options.files || [];
        delete this.options.files;

        // create form and iframe and add to document
        var uuid = 'transfer_' + new Date().getTime();
        this.options.defaultName = uuid;

        var frame = createNamedElement('iframe', uuid);
        // Give the frame a name to hide it from frames.length
        frame.name = uuid;
        // Hide frame. Avoid `display:none` to work with old Safari.
        frame.style.display = 'none';
        frame.style.position = 'fixed';
        frame.style.top = frame.style.left = '-10000px';
        document.body.appendChild(frame);

        // use form to post data and put response into iframe
        var form = document.createElement('form');
        form.style.display = 'none';
        // The form posts to the URL
        form.target = uuid;
        form.action = this.url;
        form.method = 'post';
        // old ie needs encoding rather than enctype
        form.encoding = form.enctype = 'application/x-www-form-urlencoded';
        document.body.appendChild(form);


        this.frame = frame;
        this.form = form;

        // state:
        // 1: init
        // 2: set to request location
        // 3: response from request location
        this.state = 1;

        this._setRequest();
    },
    _setRequest: function() {
        var self = this,
            frame = self.frame,
            form = self.form,
            options = self.options,
            localProxy = options.localProxy,
            done = false;

        if (frame.onreadystatechange !== undefined) {
            frame.onreadystatechange = onrequest;
        } else {
            frame.onload = onrequest;
        }

        // when success get response by window.name, call callback
        function complete() {
            var data = frame.contentWindow.name;
            // if fail to fetch the name, make it error
            if (data == options.defaultName) data = '{"error": 1}';
            self.callback(data);
        }

        function isLocal() {
            var c = false;
            try {
                c = frame.contentWindow.location.host == location.host;
                // try to get location - if we can we're still local and have to wait some more...
            } catch (er) {
                // if we're at foreign location we're sure we can proceed
            }
            return c;
        }

        function clean() {
            frame.onreadystatechange = frame.onload = null;
            frame.parentNode.removeChild(frame);
            if (form) {
                var fileArr;
                for (var i = 0, l = self._files.length; i < l; i++) {
                    fileArr = self._files[i];
                    // put file input back to origin place and remove the cloneNode
                    fileArr[2].insertBefore(fileArr[0], fileArr[1]);
                    fileArr[2].removeChild(fileArr[1]);
                }
                fileArr = null;
                self._files = [];
                form.parentNode.removeChild(form);
            }
            frame = null;
            form = null;
            for (var j in self) {
                if (self.hasOwnProperty(j)) {
                    self[j] = null;
                    delete self[j];
                }
            }
        }

        function onrequest() {
            try {
                // opera 的 frame 请求加载机制似有所不同，跳过了 state 为 1 的部分，直接进入 state 为 2 的情况；
                // 导致 form 改变 iframe 文档的 location 还没生效，保持为 blank
                if (frame.contentWindow.location.href == 'about:blank') return;
            } catch (e) {}

            if (self.state == 3) {
                if (!isLocal()) {
                    // need to set back to local location in order to have grant to access window.name
                    frame.contentWindow.location = localProxy;
                } else {
                    // ie
                    if (frame.readyState && frame.readyState.toLowerCase() != 'complete') return;

                    complete();
                    done = true;
                    clean();
                }
            }

            if (self.state == 2) {
                frame.contentWindow.location = localProxy;
                self.state = 3;
            }
        }
    },
    send: function() {
        var params = this.params,
            files = this.files,
            form = this.form,
            key,
            v;

        var _toString = Object.prototype.toString;

        // Build form fields from data
        for (key in params) {
            if (params.hasOwnProperty(key)) {
                v = params[key];
                if (_toString.call(v) === '[object Array]') {
                    var _key = key + '[]';
                    for (var i = 0, l = v.length; i < l; i++) {
                        form.appendChild(genInput(_key, v[i]));
                    }
                } else {
                    form.appendChild(genInput(key, v));
                }

            }
        }

        // if exist input[type="file"] elements,
        // because can not copy the file input's value, create a clone,
        // insert the clone before the file input, and move the origin file input to the submit form
        // in order to restore the file inputs,
        // save the relation with an array [fileEle, clone, parentNode]
        var fEle, fpEle, fCloneEle;
        var _files = this._files = [];
        var fl = files.length;
        if (fl > 0) {
            form.encoding = form.enctype = 'multipart/form-data';

            for (var fi = 0; fi < fl; fi++) {
                fEle = files[fi];
                fpEle = fEle.parentNode;
                fCloneEle = fEle.cloneNode();
                fCloneEle.disabled = 'disabled';
                _files.push([fEle, fCloneEle, fpEle]);
                fpEle.insertBefore(fCloneEle, fEle);
                form.appendChild(fEle);
            }
        }
        fEle = fpEle = fCloneEle = null;

        form.submit();

        this.state = 2;

        // generate input element with given name and value
        function genInput(name, value) {
            var input = document.createElement('input');
            input.name = name;
            input.value = value;
            return input;
        }
    },
    isObject: function(obj) {
        return Object.prototype.toString.call(obj) == '[object Object]' && !obj.nodeType;
    },
    isArray: function(obj) {
        return Object.prototype.toString.call(obj) == '[object Array]';
    },
    extend: function(target, source) {
        // deep extend
        var clone = this.clone(source);
        var i;
        for (i in clone) {
            if (clone.hasOwnProperty(i)) {
                target[i] = clone[i];
            }
        }
        return target;
    },
    clone: function(o) {
        var self = this,
            ret;

        if (self.isArray(o)) {
            ret = [];
            for (var i = 0, l = o.length; i < l; i++) {
                ret.push(self.clone(o[i]));
            }
        } else if (self.isObject(o)) {
            ret = {};
            for (var k in o) {
                if (o.hasOwnProperty(k)) {
                    ret[k] = self.clone(o[k]);
                }
            }
        } else {
            ret = o;
        }

        return ret;
    }
};
