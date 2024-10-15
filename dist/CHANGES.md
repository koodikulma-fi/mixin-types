# CHANGES

## v1.1.1

### Refines package.json
- Adds support for importing solely the types by using `"mixin-types/types"` sub module.
    - For example: `import { AsMixin } from "mixin-types/types";`.

## v1.1.0

### Refines for static typing

To help with the static side typing:
- _added_: `PickAll<T>` and `ReClass<T, Instance?, Args?>`.
- _added_: 2nd `Fallback` arg to `GetConstructorArgs<T, Fallback>` and `GetConstructorReturn<T, Fallback>`.
    * Defaults to `never` to reflect the behaviour that was previously the only option.
- _added_: `ReMixin<MixinClass, MixinInstance?, ConstructorArgs?>`.
- _modified_: `AsMixin` args by adding MixinClass: `AsMixin<MixinInstance, MixinClass?, ConstructorArgs?>`.
- _updated_: README guidelines in relation to static side typing.
