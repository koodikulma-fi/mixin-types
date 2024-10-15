# CHANGES

## v1.1.1

### Adds type variants.
- Adds variants `ReClassArgs` and `ReMixinArgs` that simply switch the order of the 2nd and 3rd argument.
    - The point is to allow inferring the class instance from the given class type, while defining args explicitly.
    - This way no need to retype the instance explicitly in case is only wanting to define the constructor args.

### Refines package.json
- Adds support for explicitly only importing the types by using `"mixin-types/types"` sub module.
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
