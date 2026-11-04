// Biblioteca de testes que roda no Web Worker e dentro do iframe de cada teste.
// É um script comum, sem import: o worker o avalia e o iframe o recebe inline.
// Define globalThis.__rt.
(function () {
  'use strict';

  function show(value, depth) {
    depth = depth || 0;
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'string') return depth ? JSON.stringify(value) : JSON.stringify(value);
    // Medidas de layout como 67.20000457763672 ficam legíveis com duas casas.
    if (typeof value === 'number' && !Number.isInteger(value) && String(value).length > 10) return String(Math.round(value * 100) / 100);
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
    if (typeof value === 'function') return '[função ' + (value.name || 'anônima') + ']';
    if (typeof value === 'symbol') return value.toString();
    if (depth > 3) return '…';
    if (value instanceof Error) return value.name + ': ' + value.message;
    if (value instanceof Date) return 'Date(' + (isNaN(value) ? 'inválida' : value.toISOString()) + ')';
    if (value instanceof RegExp) return String(value);
    if (Array.isArray(value)) return '[' + value.map(function (v) { return show(v, depth + 1); }).join(', ') + ']';
    if (value instanceof Map) return 'Map {' + Array.from(value).map(function (e) { return show(e[0], depth + 1) + ' => ' + show(e[1], depth + 1); }).join(', ') + '}';
    if (value instanceof Set) return 'Set {' + Array.from(value).map(function (v) { return show(v, depth + 1); }).join(', ') + '}';
    if (typeof Element !== 'undefined' && value instanceof Element) return '<' + value.tagName.toLowerCase() + '>';
    if (typeof value.then === 'function') return '[Promise]';
    var keys = Object.keys(value);
    return '{ ' + keys.map(function (k) { return k + ': ' + show(value[k], depth + 1); }).join(', ') + (keys.length ? ' }' : '}');
  }

  function equal(a, b) {
    if (Object.is(a, b)) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
    if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
    if (a instanceof Date) return a.getTime() === b.getTime();
    if (a instanceof RegExp) return String(a) === String(b);
    if (a instanceof Map) {
      if (a.size !== b.size) return false;
      for (var entry of a) if (!b.has(entry[0]) || !equal(entry[1], b.get(entry[0]))) return false;
      return true;
    }
    if (a instanceof Set) {
      if (a.size !== b.size) return false;
      for (var item of a) if (!b.has(item)) return false;
      return true;
    }
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) if (!equal(a[i], b[i])) return false;
      return true;
    }
    // Chaves com valor undefined contam como ausentes, como no toEqual do Jest.
    var ka = Object.keys(a).filter(function (k) { return a[k] !== undefined; });
    var kb = Object.keys(b).filter(function (k) { return b[k] !== undefined; });
    if (ka.length !== kb.length) return false;
    for (var j = 0; j < ka.length; j++) if (!Object.prototype.hasOwnProperty.call(b, ka[j]) || !equal(a[ka[j]], b[ka[j]])) return false;
    return true;
  }

  function Failure(message) {
    var error = new Error(message);
    error.name = 'Falha';
    error.__failure = true;
    return error;
  }

  function matchers(actual, negated) {
    function check(pass, message, negatedMessage) {
      if (negated ? pass : !pass) throw Failure(negated ? negatedMessage : message);
    }
    var m = {
      toBe: function (expected) {
        check(Object.is(actual, expected), 'Esperava ' + show(expected) + ', recebeu ' + show(actual), 'Esperava um valor diferente de ' + show(expected));
      },
      toEqual: function (expected) {
        check(equal(actual, expected), 'Esperava ' + show(expected) + ', recebeu ' + show(actual), 'Esperava um valor diferente de ' + show(expected));
      },
      toStrictEqual: function (expected) { m.toEqual(expected); },
      toBeTruthy: function () { check(!!actual, 'Esperava um valor verdadeiro, recebeu ' + show(actual), 'Esperava um valor falso, recebeu ' + show(actual)); },
      toBeFalsy: function () { check(!actual, 'Esperava um valor falso, recebeu ' + show(actual), 'Esperava um valor verdadeiro, recebeu ' + show(actual)); },
      toBeNull: function () { check(actual === null, 'Esperava null, recebeu ' + show(actual), 'Esperava um valor diferente de null'); },
      toBeUndefined: function () { check(actual === undefined, 'Esperava undefined, recebeu ' + show(actual), 'Esperava um valor definido'); },
      toBeDefined: function () { check(actual !== undefined, 'Esperava um valor definido, recebeu undefined', 'Esperava undefined, recebeu ' + show(actual)); },
      toBeNaN: function () { check(Number.isNaN(actual), 'Esperava NaN, recebeu ' + show(actual), 'Esperava um número, recebeu NaN'); },
      toBeGreaterThan: function (n) { check(actual > n, 'Esperava mais que ' + n + ', recebeu ' + show(actual), 'Esperava no máximo ' + n + ', recebeu ' + show(actual)); },
      toBeGreaterThanOrEqual: function (n) { check(actual >= n, 'Esperava pelo menos ' + n + ', recebeu ' + show(actual), 'Esperava menos que ' + n + ', recebeu ' + show(actual)); },
      toBeLessThan: function (n) { check(actual < n, 'Esperava menos que ' + n + ', recebeu ' + show(actual), 'Esperava pelo menos ' + n + ', recebeu ' + show(actual)); },
      toBeLessThanOrEqual: function (n) { check(actual <= n, 'Esperava no máximo ' + n + ', recebeu ' + show(actual), 'Esperava mais que ' + n + ', recebeu ' + show(actual)); },
      toBeCloseTo: function (n, digits) {
        var limit = Math.pow(10, -(digits === undefined ? 2 : digits)) / 2;
        check(Math.abs(actual - n) < limit, 'Esperava perto de ' + n + ', recebeu ' + show(actual), 'Esperava longe de ' + n);
      },
      toBeInstanceOf: function (type) { check(actual instanceof type, 'Esperava uma instância de ' + type.name + ', recebeu ' + show(actual), 'Esperava algo que não fosse ' + type.name); },
      toContain: function (item) {
        var pass = actual != null && typeof actual.includes === 'function' && actual.includes(item);
        check(pass, 'Esperava que ' + show(actual) + ' contivesse ' + show(item), 'Esperava que ' + show(actual) + ' não contivesse ' + show(item));
      },
      toContainEqual: function (item) {
        var pass = Array.isArray(actual) && actual.some(function (v) { return equal(v, item); });
        check(pass, 'Esperava que ' + show(actual) + ' contivesse ' + show(item), 'Esperava que ' + show(actual) + ' não contivesse ' + show(item));
      },
      toHaveLength: function (n) {
        var length = actual == null ? undefined : actual.length;
        check(length === n, 'Esperava tamanho ' + n + ', recebeu ' + show(length), 'Esperava tamanho diferente de ' + n);
      },
      toHaveProperty: function (key, value) {
        var pass = actual != null && key in Object(actual) && (arguments.length < 2 || equal(actual[key], value));
        check(pass, 'Esperava a propriedade ' + show(key) + (arguments.length > 1 ? ' com ' + show(value) : '') + ' em ' + show(actual), 'Não esperava a propriedade ' + show(key));
      },
      toMatch: function (pattern) {
        var pass = typeof actual === 'string' && (pattern instanceof RegExp ? pattern.test(actual) : actual.includes(pattern));
        check(pass, 'Esperava que ' + show(actual) + ' combinasse com ' + show(pattern), 'Esperava que ' + show(actual) + ' não combinasse com ' + show(pattern));
      },
      toMatchObject: function (expected) {
        var pass = actual != null && Object.keys(expected).every(function (k) { return equal(actual[k], expected[k]); });
        check(pass, 'Esperava que ' + show(actual) + ' tivesse ' + show(expected), 'Esperava que ' + show(actual) + ' não tivesse ' + show(expected));
      },
      toThrow: function (expected) {
        if (typeof actual !== 'function') throw Failure('toThrow precisa receber uma função, como expect(() => f()).toThrow()');
        var thrown = null;
        try { actual(); } catch (error) { thrown = error || new Error(String(error)); }
        var message = thrown && thrown.message !== undefined ? String(thrown.message) : String(thrown);
        var pass = !!thrown && (expected === undefined ||
          (expected instanceof RegExp ? expected.test(message) :
            typeof expected === 'function' ? thrown instanceof expected : message.includes(expected)));
        check(pass, thrown ? 'A função lançou ' + show(message) + ', diferente do esperado ' + show(expected) : 'Esperava que a função lançasse um erro', 'Esperava que a função não lançasse erro, mas lançou ' + show(message));
      },
      toHaveBeenCalled: function () {
        var calls = mockCalls(actual);
        check(calls.length > 0, 'Esperava que a função fosse chamada', 'Esperava que a função não fosse chamada, mas foi chamada ' + calls.length + ' vez(es)');
      },
      toHaveBeenCalledTimes: function (n) {
        var calls = mockCalls(actual);
        check(calls.length === n, 'Esperava ' + n + ' chamada(s), houve ' + calls.length, 'Esperava um número de chamadas diferente de ' + n);
      },
      toHaveBeenCalledWith: function () {
        var args = Array.prototype.slice.call(arguments);
        var calls = mockCalls(actual);
        var pass = calls.some(function (c) { return equal(c, args); });
        check(pass, 'Esperava uma chamada com ' + show(args) + '. Chamadas: ' + show(calls), 'Não esperava chamada com ' + show(args));
      },
    };
    return m;
  }

  function mockCalls(f) {
    if (!f || !f.mock) throw Failure('Esse matcher precisa de uma função criada com fn()');
    return f.mock.calls;
  }

  function expect(actual) {
    var api = matchers(actual, false);
    api.not = matchers(actual, true);
    // resolves e rejects devolvem promessas: use com await.
    api.resolves = wrapAsync(function () { return Promise.resolve(actual); });
    api.rejects = wrapAsync(function () {
      return Promise.resolve(actual).then(
        function (v) { throw Failure('Esperava que a promessa fosse rejeitada, mas resolveu com ' + show(v)); },
        function (e) { return e instanceof Error ? e.message : e; },
      );
    });
    return api;
  }

  function wrapAsync(get) {
    var out = {};
    Object.keys(matchers(undefined, false)).forEach(function (name) {
      out[name] = function () {
        var args = arguments;
        return get().then(function (value) { matchers(value, false)[name].apply(null, args); });
      };
    });
    return out;
  }

  /** Função espiã, como vi.fn() e jest.fn(). */
  function fn(impl) {
    var spy = function () {
      var args = Array.prototype.slice.call(arguments);
      spy.mock.calls.push(args);
      var current = spy.mock.queue.length ? spy.mock.queue.shift() : spy.mock.impl;
      var result = current ? current.apply(this, args) : undefined;
      spy.mock.results.push(result);
      return result;
    };
    spy.mock = { calls: [], results: [], impl: impl, queue: [] };
    spy.mockImplementation = function (f) { spy.mock.impl = f; return spy; };
    spy.mockImplementationOnce = function (f) { spy.mock.queue.push(f); return spy; };
    spy.mockReturnValue = function (v) { spy.mock.impl = function () { return v; }; return spy; };
    spy.mockResolvedValue = function (v) { spy.mock.impl = function () { return Promise.resolve(v); }; return spy; };
    spy.mockClear = function () { spy.mock.calls = []; spy.mock.results = []; return spy; };
    return spy;
  }

  function wait(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms || 0); }); }

  /** Coleta describe/it/test para os problemas em que o aluno escreve os testes. */
  function suite() {
    var cases = [];
    var prefix = [];
    var api = {
      describe: function (name, body) { prefix.push(name); try { body(); } finally { prefix.pop(); } },
      it: function (name, body) { cases.push({ name: prefix.concat(name).join(' › '), body: body }); },
      cases: cases,
    };
    api.test = api.it;
    return api;
  }

  function messageOf(error) {
    if (error && error.__failure) return error.message;
    if (error instanceof Error) return error.name + ': ' + error.message;
    return 'Erro: ' + show(error);
  }

  var dom = {};
  if (typeof document !== 'undefined') {
    var pick = function (target) {
      if (typeof target !== 'string') return target;
      var el = document.querySelector(target);
      if (!el) throw Failure('Nenhum elemento encontrado para ' + target);
      return el;
    };
    dom = {
      $: function (selector) { return document.querySelector(selector); },
      $$: function (selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); },
      el: pick,
      css: function (target, property) { return getComputedStyle(pick(target)).getPropertyValue(property).trim(); },
      rect: function (target) { return pick(target).getBoundingClientRect(); },
      text: function (target) { return pick(target).textContent.replace(/\s+/g, ' ').trim(); },
      click: function (target) { pick(target).click(); },
      // Muda o valor como o navegador faria, inclusive para inputs controlados pelo React.
      type: function (target, value) {
        var el = pick(target);
        var proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      },
      press: function (target, key) {
        var el = pick(target);
        el.dispatchEvent(new KeyboardEvent('keydown', { key: key, bubbles: true, cancelable: true }));
        el.dispatchEvent(new KeyboardEvent('keyup', { key: key, bubbles: true, cancelable: true }));
      },
      submit: function (target) {
        var form = pick(target);
        if (typeof form.requestSubmit === 'function') form.requestSubmit();
        else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      },
      tick: function () { return new Promise(function (resolve) { setTimeout(resolve, 0); }); },
      // Sem requestAnimationFrame: o Chrome pausa esse callback em iframes fora da tela.
      frame: function () { return new Promise(function (resolve) { setTimeout(function () { void document.body.offsetHeight; resolve(); }, 20); }); },
    };
  }

  var names = ['expect', 'fn', 'wait'].concat(Object.keys(dom));
  var values = [expect, fn, wait].concat(Object.keys(dom).map(function (k) { return dom[k]; }));

  globalThis.__rt = {
    show: show,
    equal: equal,
    expect: expect,
    fn: fn,
    wait: wait,
    suite: suite,
    messageOf: messageOf,
    dom: dom,
    names: names,
    values: values,
  };
})();
