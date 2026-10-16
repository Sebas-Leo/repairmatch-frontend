/**
 * Every place, anywhere reachable from `root`, where `needle` appears: in a
 * string value, a property name, an error message/stack or a `cause`. It walks
 * own properties (enumerable or not, symbols included), arrays, Maps, Sets and
 * Headers, so an error that quietly keeps the axios `config` (and its
 * Authorization header) is caught wherever it is hidden.
 */
export function findSecret(root: unknown, needle: string): string[] {
  const found: string[] = [];
  const seen = new WeakSet<object>();

  function visit(value: unknown, trail: string) {
    if (typeof value === 'string') {
      if (value.includes(needle)) found.push(`${trail} = ${value}`);
      return;
    }
    if (typeof value !== 'object' || value === null) return;
    if (seen.has(value)) return;
    seen.add(value);

    for (const key of Reflect.ownKeys(value)) {
      const name = typeof key === 'symbol' ? key.toString() : key;
      if (name.includes(needle)) found.push(`${trail} has key ${name}`);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && 'value' in descriptor) {
        visit(descriptor.value, `${trail}.${name}`);
      }
    }
    // Error text lives on the prototype for some errors (for example DOMException).
    if (value instanceof Error || 'message' in value) {
      const { message, stack, cause } = value as Record<string, unknown>;
      visit(message, `${trail}.message`);
      visit(stack, `${trail}.stack`);
      visit(cause, `${trail}.cause`);
    }
    if (value instanceof Map || value instanceof Headers) {
      for (const [entryKey, entryValue] of value.entries()) {
        visit(entryKey, `${trail}.<key>`);
        visit(entryValue, `${trail}.<entry>`);
      }
    }
    if (value instanceof Set) {
      for (const entry of value) visit(entry, `${trail}.<member>`);
    }
  }

  visit(root, 'root');
  return found;
}
