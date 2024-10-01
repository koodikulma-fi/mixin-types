# CHANGES

## v1.0.1

### Additions

To help with the static side typing:
- Added `PickAll<T>` and `ReClass<T, Instance?, Args?>`.
- Added 2nd `Fallback` arg to `GetConstructorArgs<T, Fallback>` and `GetConstructorReturn<T, Fallback>`.
    * Defaults to `never` to reflect the behaviour that was previously the only option.
- Updated README guidelines in relation to static side typing.
