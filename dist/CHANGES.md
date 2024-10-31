# CHANGES

## v1.1.1 (2024-10-31)

### Adds 4 type variants.
- Adds types `ReClassArgs`, `ReMixinArgs`, `AsMixinArgs` and `AsInstanceArgs` that require constructor args as the 2nd type arg (not 3rd).
    - For `ReClassArgs` and `ReMixinArgs` the point is to allow inferring the class instance (3rd arg) from the given class type (1st arg), while defining args explicitly to make usage more convenient in some cases.
    - Likewise `AsMixin` and `AsInstanceArgs` help to infer the class type (3rd arg) automatically from the instance type (1st arg).

### Refines package.json
- Adds support for (explicitly) only importing the types by using `"mixin-types/types"` sub module.
    - For example: `import { AsMixin } from "mixin-types/types";`.

## v1.1.0 (2024-10-11)

### Refines for static typing

To help with the static side typing:
- _added_: `PickAll<T>` and `ReClass<T, Instance?, Args?>`.
- _added_: 2nd `Fallback` arg to `GetConstructorArgs<T, Fallback>` and `GetConstructorReturn<T, Fallback>`.
    * Defaults to `never` to reflect the behaviour that was previously the only option.
- _added_: `ReMixin<MixinClass, MixinInstance?, ConstructorArgs?>`.
- _modified_: `AsMixin` args by adding MixinClass: `AsMixin<MixinInstance, MixinClass?, ConstructorArgs?>`.
- _updated_: README guidelines in relation to static side typing.
