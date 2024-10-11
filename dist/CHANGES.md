# CHANGES

## v1.1.0

### Refines for static typing

To help with the static side typing:
- _added_: `PickAll<T>` and `ReClass<T, Instance?, Args?>`.
- _added_: 2nd `Fallback` arg to `GetConstructorArgs<T, Fallback>` and `GetConstructorReturn<T, Fallback>`.
    * Defaults to `never` to reflect the behaviour that was previously the only option.
- _added_: `ReMixin<MixinClass, MixinInstance?, ConstructorArgs?>`.
- _modified_: `AsMixin` args by adding MixinClass: `AsMixin<MixinInstance, MixinClass?, ConstructorArgs?>`.
- _updated_: README guidelines in relation to static side typing.
