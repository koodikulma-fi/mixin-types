
## WHAT

`mixin-types` is a tiny library providing typing tools for mixin classes and 2 simple JS funcs (`mixins` and `mixinsWith`).

The npm package can be found with: [mixin-types](https://www.npmjs.com/package/mixin-types). Contribute in GitHub: [koodikulma-fi/mixin-types.git](https://github.com/koodikulma-fi/mixin-types.git)

The documentation below explains how to set up and use mixins in various circumstances.
1. [General guidelines](#1-general-guidelines)
2. [Simple mixins](#2-simple-mixins)
3. [Passing generic params (simple cases)](#3-passing-generic-parameters-simple-cases)
4. [Complex mixins and generic parameters](#4-complex-mixins-and-generic-parameters)
5. [Constructor arguments](#5-constructor-arguments)
6. [Limits of `instanceof`](#6-limits-of-instanceof-with-mixins)
7. [JavaScript implementations](#7-javascript-implementations)
8. [TypeScript tools](#8-typescript-tools)
9. [Shortcut - 2 simple types to solve it all](#9-shortcut---2-simple-types-to-solve-it-all)

---

## 1. GENERAL GUIDELINES
- For a clean overall mixin architecture, keep the purpose of each mixin simple and detached from each other.
- If a mixin is dependent on another mixin, consider _including_ it, instead of _requiring_ it.
    * For example: `mixinMyMonster = (Base) => return class MyMonster extends mixinMyCreature(Base) { ... }`.
- Keep constructor arguments clean and minimal (and their count fixed), or preferably don't use them at all.
- Finally, use mixins as simple base blocks to create your "final" classes. Don't use mixins excessively.
- That said, mixins can be wonderfully useful and provide an easy way to avoid writing same code many times.

---

## 2. SIMPLE MIXINS

- For sequencing many mixins together, use the `mixins` and `mixinsWith` methods.

### 2.1. Using `mixins` (for a sequence of mixins)

```typescript

// Create mixins.
const mixinTest1 = <Info = {}>(Base: ClassType) => class Test1 extends Base {
    num: number = 5;
    testMe(testInfo: Info): void {}
}
const mixinTest2 = (Base: ClassType) => class Test2 extends Base {
    name: string = "";
}
const mixinTest3 = <Info = {}>(Base: ReturnType<typeof mixinTest1<Info>>) => class Test3 extends Base { }

// Create a mixed class.
// .. Provide MyInfo systematically to all that use it. Otherwise you get `unknown` for the related type.
type MyInfo = { something: boolean; };
class MyMix extends mixins(mixinTest1<MyInfo>, mixinTest2, mixinTest3<MyInfo>) {
    test() {
        this.testMe({ something: true }); // Requires `MyInfo`.
        this.name = "Mixy"; // Requires `string`.
        this.num; // number;
    }
}

// Test failure.
// .. mixinTest3 is red-underlined (not assignable to `never`) as it requires mixinTest1.
class MyFail extends mixins(mixinTest3) { }

// If you use the above mixins manually, you can run into two problems (that's why `mixins` function exists).
// 1. The result won't give you the combined type. Though you could use MergeMixins or AsClass type to re-type it.
// 2. You get problems with intermediate steps in the chain - unless you specifically want it.
// +  The core reason for these problems is that each pair is evaluated separately, not as a continuum.
//
class MyManualMix extends mixinTest3<MyInfo>(mixinTest2(mixinTest1<MyInfo>(Object))) {
    // In the above line `mixinTest2(...)` is red-underlined, because it doesn't fit `mixinTest3`'s argument about requiring `mixinTest1`.
    test() {
        this.testInfo({ something: false }); // testInfo red-underlined because not existing.
        this.someMember = 8; // someMember is red-underlined because because not existing.
        this.enabled; // enabled is red-underlined because because not existing.
    }
}

```

### 2.2. Using `mixinsWith` (for a mixin sequence with a base class)

```typescript

// Create a base class and some mixins.
class MyBase<Info = {}> {
    static STATIC_ONE = 1;
    testInfo(info: Info): void {}
}
const mixinTest1 = (Base: ClassType) => class Test1 extends Base {
    someMember: number = 5;
}
const mixinTest2 = <Info = {}>(Base: typeof MyBase<Info>) => class Test2 extends Base {
    enabled: boolean = false;
}
const mixinTest3 = <Info = {}>(Base: ReturnType<typeof mixinTest2<Info>>) => class Test3 extends Base { }

// Create a mixed class.
// .. Provide MyInfo systematically to all that use it. Otherwise you get `unknown` for the related type.
type MyInfo = { something: boolean; };
class MyMix extends mixinsWith(MyBase<MyInfo>, mixinTest1, mixinTest2<MyInfo>, mixinTest3<MyInfo>) {
    test() {
        this.testInfo({ something: false }); // Requires `MyInfo`.
        this.someMember = 8; // Requires `number`.
        this.enabled; // boolean;
    }
}

// Test failure.
// .. mixinTest2 is red-underlined as it requires MyBase, Object is not enough.
class MyFail extends mixinsWith(Object, mixinTest2) { }

// If you use the above mixins and base class manually, you get two problems (that's why `mixinsWith` function exists).
// 1. The result won't give you the combined type. Though you could use MergeMixins or AsClass type to re-type it.
// 2. You get problems with intermediate steps in the chain - unless you specifically want it.
// +  The core reason for these problems is that each pair is evaluated separately, not as a continuum.
//
class MyManualMix extends mixinTest3<MyInfo>(mixinTest2<MyInfo>(mixinTest1(MyBase<MyInfo>))) {
    // In the above line `mixinTest1(...)` is red-underlined, because it doesn't fit `mixinTest2`'s argument about requiring `Base`.
    test() {
        this.testInfo({ something: false }); // Requires `MyInfo`. // It's correct.
        this.someMember = 8; // someMember is red-underlined because because not existing.
        this.enabled; // boolean; // It's correct.
    }
}

```

## 3. PASSING GENERIC PARAMETERS (simple cases)
- To pass in generic parameters from a class, there's an inherent problem: _Base class expressions cannot reference class type parameters_.
- This problem can be overcome using the trick of declaring a matching `interface` for the new `class`.

### 3.1. Using `mixins` and `MixinsInstance`

```typescript

// Prepare for the example below.
type MyInfo = { something: boolean; };
const mixinTestGen = <Info = {}>(Base: ClassType) => class TestGen extends Base {
    num: number = 5;
    testMe(testInfo: Info): void {}
}

// You might want to pass the Info arg further to a mixed base, but TS won't allow it. 
// .. In the lines below, <Info> is red-underlined, as base class expr. cannot ref. class type params.
class MyClass_Wish<Info extends Record<string, any> = {}> extends mixins(mixinTestGen<Info>) { }
class MyClass_Wish_Manual<Info extends Record<string, any> = {}> extends mixinTestGen<Info>(Object) { }

// So instead do to this.
// 1. Create a class extending mixinTestGen using `as ClassType` to loosen the base class type.
// .. Remarkably, _after_ setting up the interface below, we do have access to the base class even inside the extending class.
//
class MyClass<Info extends Record<string, any> = {}> extends (mixins(mixinTestGen) as ClassType) {
    myMethod(key: keyof Info & string): number { return this.num; } // `num` is a recognized class member.
}
// 2. Create a matching interface extending what we actually want to extend.
// .. Another remarkable thing is that there's no need to actually retype the class in the interface.
//
interface MyClass<Info extends Record<string, any> = {}> extends MixinsInstance<[typeof mixinTestGen<Info>]> { }
// .. The line below would work equally well for a single mixin case like this.
// interface MyClass<Info extends Record<string, any> = {}> extends InstanceType<ReturnType<typeof mixinTestGen<Info>>> { }

// Test the result, and prove the claim in step 2.
const myClass = new MyClass<MyInfo>();
myClass.testMe({ something: false }); // Requires `MyInfo`.
const value = myClass.myMethod("something"); // Requires `keyof MyInfo & string`. Returns `number`.
myClass.num === value; // The type is `boolean`, and outcome `true` on JS side.

```

### 3.2. Using `mixinsWith` and `MixinsInstanceWith`

```typescript


// Prepare for the example below.
type MyInfo = { something: boolean; };
class MyBase<Info = {}> {
    static STATIC_ONE = 1;
    testInfo(info: Info): void {}
}
const mixinTestGen = (Base: ClassType) => class TestGen extends Base {
    someMember: number = 5;
}

// You might want to pass the Info arg further to a mixed base, but TS won't allow it. 
// .. In the lines below, the <Info>s are red-underlined, as base class expressions cannot ref. class type params.
class MyClass_Wish<Info extends Record<string, any> = {}> extends mixinsWith(MyBase<Info>, mixinTestGen) { }
class MyClass_Wish_Manual<Info extends Record<string, any> = {}> extends mixinTestGen(MyBase<Info>) { }

// So instead do to this.
// 1. Create a class extending MyBase, mixinTestGen using `as ClassType` to loosen the base class type.
// .. Remarkably, _after_ setting up the interface below, we do have access to the base class even inside the extending class.
//
class MyClass<Info extends Record<string, any> = {}> extends (mixinsWith(MyBase, mixinTestGen) as ClassType) {
    myMethod(key: keyof Info & string): number { return this.someMember; } // `someMember` is a recognized class member.
}

// 2. Create a matching interface extending what we actually want to extend.
// .. Another remarkable thing is that there's no need to actually retype the class in the interface. Just declare it.
//
interface MyClass<Info extends Record<string, any> = {}>
    extends MixinsInstanceWith<typeof MyBase<Info>, [typeof mixinTestGen]> { }

// Test the result, and prove the claim in step 2.
const myClass = new MyClass<MyInfo>();
const value = myClass.myMethod("something"); // Requires `keyof MyInfo & string`. Returns `number`.
myClass.testInfo({ something: true });// Requires `MyInfo`.
myClass.someMember = 3; // Requires `number`.
myClass.constructor.STATIC_ONE; // number

```

---

## 4. COMPLEX MIXINS AND GENERIC PARAMETERS

- As can be seen from examples above, even generic parameters work nice and easy.
- However, as things get more complex, you probably run into an issue with excessive deepness of the mixin types.
- Solutions to overcome this issue easily lead to others. So below is the recommended approach:
    1. Issue with excessive deepness. -> Use explicit typing.
    2. Issues with circular reference with explicit typing. -> Retype as `ClassType` or use private + public mixin.
    3. Minor issue with losing the type of the base class. -> Can use `typeof MyBase` or `AsMixin` helper.

### 4.1. Excessive deepness -> explicit typing
- Firstly, to overcome the problem of excessive deepness of the types, the solution is to use explicit typing.
- So the mixin function itself should define explicitly what it returns, so that typescript won't have to interpret it from the code.

```typescript

// - Class - //

// Some internal typing.
type SignalsRecord = Record<string, (...args: any[]) => void>;

// Let's declare SignalBoy class using private untyped `_mixinSignalBoy(Object?: ClassType) => ClassType` as the basis.
export class SignalBoy<Signals extends SignalsRecord = {}> extends _mixinSignalBoy() { }
// Or alternatively use one mixin but retype with `as any as ClassType`.
// .. Note that it's not enough with `as ClassType` (circularity).
// .. Note also that if we had a base class would still use: `as any as ClassType` here.
// export class SignalBoy<Signals extends SignalsRecord = {}> extends (mixinSignalBoy() as any as ClassType) { }

// Let's declare the interface with explicit typing.
export interface SignalBoy<Signals extends SignalsRecord = {}> {
    // // It's not recommended to type the "constructor" for mixins - only on final classes.
    // ["constructor"]: SignalBoyType<Signals>; // Link to the static side.
    // Members.
    signals: Record<string, Array<(...args: any[]) => void>>;
    // Let's define the typed methods here.
    listenTo<Name extends string & keyof Signals>(name: Name, callback: Signals[Name], extraArgs?: any[] | null): void;
    sendSignal<Name extends string & keyof Signals>(name: Name, ...args: Parameters<Signals[Name]>): void;
}

// Optionally define the non-instanced class type.
export interface SignalBoyType<Signals extends SignalsRecord = {}> extends ClassType<SignalBoy<Signals>> {
    // Any static members and methods here.
    DEFAULT_TIMEOUT: number | null;
}


// - Circular mixin - //

// If _mixinSignalBoy would refer to SignalBoy (or SignalBoyType) explicitly, there would be a circular reference.
function mixinSignalBoy_CIRCULAR<Data = {}, TBase extends ClassType = ClassType>(Base: TBase): SignalBoyType<Data> & TBase {
    return class SignalBoy extends Base {
        // ...
    } as any; // Would have to detach here from expected outcome.
}

```

### 4.2. Avoiding circular references
- To avoid the problem with circularity there are at least 2 main working approaches.
    * #1 Retype the internal mixin use: `class SignalBoy extends (mixinSignalBoy() as any as ClassType) {}`.
    * #2 Split the mixin to private and public parts: `class SignalBoy extends _mixinSignalBoy() {}`.
    * #3 DON'T: Use a non-class-linked dummy interface: eg. `interface _SignalBoy {}`. It leads to the problem of private/unexported interface.


```typescript

// - Mixin (private) - //

// For local use only.
// .. For clarity of usage and avoid problems with deepness,
// .. we don't use the <Data> here at all and return ClassType.
function _mixinSignalBoy(Base?: ClassType): ClassType {
    
    // Return extended class using simple non-typed variants inside.
    return class SignalBoy extends (Base || Object) {

        public static DEFAULT_TIMEOUT: number | null = 0;
        public signals: Record<string, Array<(...args: any[]) => void>> = {};

        public listenTo(name: string, callback: (...args: any[]) => void, extraArgs?: any[]): void {
            // Here would be JS implementation.
        }
        
        public sendSignal(name: string, ...args: any[]): void {
            // Here would be JS implementation.
        }

    }
}


// - Mixin (public) - //

/** Add DataBoy features to a base class.
 * - Provide BaseClass type specifically (2nd arg) or use AsMixin type helper.
 */
export function mixinSignalBoy<
    Signals extends SignalsRecord = {},
    BaseClass extends ClassType = ClassType
>(Base?: BaseClass): SignalBoyType<Signals> & BaseClass {
    // We just use the same internal JS method.
    return _mixinSignalBoy(Base) as any;
}

// For more complex cases, it's recommended to use the pattern below with AsClass.
/** Add DataBoy features to a base class.
 * - Provide BaseClass type specifically (2nd arg) or use AsMixin type helper.
 */
export function mixinSignalBoy_ALT<
    Signals extends SignalsRecord = {},
    BaseClass extends ClassType = ClassType
>(Base?: BaseClass): AsClass<
    // Static.
    SignalBoyType<Signals> & BaseClass,
    // Instanced.
    SignalBoy<Signals> & InstanceType<BaseClass>,
    // Constructor args. Just allow to pass in any, not used.
    any[]
> {
    // We just use the same internal JS method.
    return _mixinSignalBoy(Base) as any;
}

```

### 4.3. Minor issue with losing the type of the base class

- So the above works and there's no circularity and issues with deepness or when used externally.
- The only annoyance is that the `mixinSignalBoy` above loses the automated BaseClass type from the actual arg.
- This can be overcome externally in two ways: 1. Provide it with `typeof MyBase`, 2. Use `AsMixin` type helper.

```typescript

// 0. MyBase and MySignals.
type MySignals = { test: (num: number) => void; };
class MyBase {
    public name: string = "";
}
// 1. Just type it in using `typeof`.
class MyMix1 extends mixinSignalBoy<MySignals, typeof MyBase>(MyBase) {}
// 2. Or use `AsMixin` helper type.
class MyMix2 extends (mixinSignalBoy as AsMixin<SignalBoy<MySignals>>)(MyBase) {}

// In any case test.
const myMix1 = new MyMix1();
const myMix2 = new MyMix1();
myMix1.listenTo("test", (num) => { });
myMix2.listenTo("test", (num) => { });
myMix1.sendSignal("test", 1);
myMix2.sendSignal("test", 2);
myMix1.name = "test";
myMix2.name; // string;

```

### Extra - elevating MyMix to have generic parameters

```typescript

// To uplift MyMix to have generic parameters, just define class + interface, like done above.
// .. Class extending ClassType.
class MyMix<AddSignals extends SignalsRecord = {}> extends (mixinSignalBoy(MyBase) as ClassType) {
    // Just to define constructor explicitly. In our mixing chain, there's no constructor args.
    constructor() {
        super();
    }
    test() {
        // Inside the class use `(this as MyMix)` to drop generics from Signals used.
        (this as MyMix).sendSignal("test", 1);
    }
}
// .. Interface explicitly typed - including inheritance from SignalBoy and MyBase.
interface MyMix<AddSignals extends SignalsRecord = {}>
    extends SignalBoy<MySignals & AddSignals>, MyBase { }

// Test.
const myMix = new MyMix<{ sendDescription: (title: string, content: string) => void; }>();
myMix.name = "myMix";
myMix.listenTo("test", num => {});
myMix.listenTo("sendDescription", (title, content) => {});
myMix.sendSignal("sendDescription", "Mixins", "So many things.");
myMix.constructor.DEFAULT_TIMEOUT; // number | null

// Finally, if you need to make MyMix be a mixin (in addition to a class),
// .. just repeat what is done here for SignalBoy.


```

---

## 5. CONSTRUCTOR ARGUMENTS

### 5.1. Rules of thumb
- Generally speaking, you should prefer _not_ using constructor arguments in mixins.
    * When needed, keep them simple, and use fixed number of arguments (eg. not 1-3 args, but eg. 2).
    * Note also that it's not possible to automate typing for constructor arguments (see the code example below).
    * As it's always the _last mixin / extending class_ that defines the args - and as such, should do it explicitly.
- At the conceptual level, the constructor args of the mix should be defined for each mix explicitly.
    * This can be done either directly to a mix (with `MergeMixins` or `AsClass`) or by extending the mix with a class and use its constructor.
    * It's then the responsibility of the sequence composer to make sure the flow makes sense and that constructor args flow as expected.
    * And likewise each mixin should 1. keep constructor args clean, and 2. always pass unknown args further: `constructor(myStuff: Stuff, ...args: any[]) { super(...args); }`.
        - Well, actually TS wants `(...args: any[])`, since:  _A mixin class must have a constructor with a single rest parameter of type 'any[]'._
        - But we can work around it by a simple trick of `extends (Base as ClassType)` - see below.

### 5.2. Why cannot the arguments be automated?
- The simple answer is that it's _not known how mixins use the constructor args_.
- The below example demonstrations this point while showcasing how to use constructor arguments.

### 5.3. Using constructor args

```typescript

// Let's say we have two (simple) mixins: mixinDataMan, and mixinDataMonster that requires mixinDataMan.

// DataMan.
// .. Let's define interfaces for DataMan with two constructor args (data: Data, settings: Settings).
interface DataManType<Data = {}, Settings = {}> extends
    // Alt. args: `{} extends Data ? [Data?, Settings?, ...any[]] : [Data, Settings?, ...any[]]`
    ClassType<DataMan<Data, Settings>, [data: Data, settings: Settings, ...args: any[]]> {}
interface DataMan<Data = {}, Settings = {}> {
    // // It's not recommended to type the "constructor" for mixins - only on final classes.
    // ["constructor"]: DataManType<Data, Settings>; // Link to the static side.
    data: Data;
    settings: Settings;
}
// .. DataMan uses args for (data: Data, settings: Settings) and requires just ClassType base.
function mixinDataMan<
    Data = {},
    Settings = {},
    TBase extends ClassType = ClassType
>(Base: TBase): DataManType<Data, Settings> & TBase {
    return class DataMan extends Base {
        data: Data;
        settings: Settings;
        // Note. If we would use: `extends (Base as ClassType)`,
        // .. then we could use:  `(data: Data, settings: Settings, ...args: any[])`
        // .. or use opt. args:   `(data?: Data, settings?: Settings, ...args: any[])`
        constructor(...args: any[]) {
            super(...args.slice(2));
            this.data = args[0] || {};
            this.settings = args[1] || {};
        }
    } as any; // We have explicitly typed the return.
}

// DataMonster has (stuff: Stuff) as args and requires DataManType.
function mixinDataMonster<
    Stuff extends Partial<{ data: any; settings: any; }> = {},
    TBase extends DataManType = DataManType<Stuff["data"], Stuff["settings"]>
>(Base: TBase): AsClass<
    DataManType<Stuff["data"], Stuff["settings"]>, // Static.
    DataMan<Stuff["data"], Stuff["settings"]>, // Instanced.
    [stuff?: Stuff, ...args: any[]] // Constructor args.
> {
    // Note. By using `(Base as DataManType)`, we can define constructor args more nicely.
    // .. Otherwise gets error about mixin constructor not being `any[]`.
    return class DataMonster extends (Base as DataManType) {
        constructor(stuff?: Stuff, ...args: any[]) {
            // Remap the args.
            super(stuff?.data, stuff?.settings, ...args);
        }
    } as any; // We have explicitly typed the return.
}

// Finally, as is evident, we cannot just add up the args based on order of mixins.
// .. It's simply always the _last in the chain_ that defines the args, while all pass them on.
type MyStuff = { data: { something: boolean; }; settings: any; };
class MyMonster extends mixins(mixinDataMan<MyStuff["data"], MyStuff["settings"]>, mixinDataMonster<MyStuff>) {
    test() {
        this.data; // { something: boolean; }
        this.settings; // any
    }
}
const myMonster = new MyMonster({ data: { something: false }, settings: null });
myMonster.data; // { something: boolean; }
myMonster.settings; // any

```

---

## 6. LIMITS OF `instanceof` WITH MIXINS
- The usage of `instanceof` is very limited with mixins as mixins always produce a new class.
    * That is, you can't use `instanceof` to check for mixin bases, since each mixin class was dynamically created.
    * However, the final class is compatible with `instanceof` - in case you have other classes extending it.
- Examples of working around.
    * #1: Use mixins only as building blocks to compose the "main classes" and use `instanceof` only for them.
        - Using mixins on your main class tree will necessarily complicate using `instanceof` -> approach #2.
    * #2: Manual implementation. For example:
        - Add `static CLASS_NAMES: string[]` member that is required for all mixins (and classes) in your system. Let's call it `BaseClassType`.
        - When a mixin extends a class, it adds its unique mixin (class) name to its static CLASS_NAMES member.
            * Likewise classes add their names on the static side: `static CLASS_NAMES = [...MyBaseClass.CLASS_NAMES, "MyClass"]`.
        - Finally, you'd have a custom function for checking inheritance:
            * `isInstanceOf(Class: BaseClassType, className: string): boolean { return Class.CLASS_NAMES.includes(className); }`.
- It's also worth noting that the larger architectural choices at the conceptual level have reverberations all the way down to these details.
    * For example, questions about using a complex tree of classes with inheritance vs. using a modular structure (-> and a smaller class tree).
    * In a tree of classes you can use mixins as base building blocks (nor part of tree), whereas in a more modular structure you wouldn't really use mixins for the modules (or again, as base building blocks for them). This is because, mixins are essentially an alternative to (or an implementation of) modularity, although tied to class inheritance: anyway, you just pick your modules, like you pick your mixins.
    * The point here is that, if you have a complex class tree structure, mixing in mixins is not necessarily going to solve the problems, but merely shift their form. That is, you get a new domain of tiny little problems here and there by introducing mixings to a clean class inheritance tree.

---

## 7. JAVASCRIPT IMPLEMENTATIONS

- For usage, see [simple mixins](#2-simple-mixins) and [passing generic params](#3-passing-generic-parameters-simple-cases) above.

### 7.1. `mixins`

```typescript

// On the JS side, the feature is implemented like this.
// .. Usage: `class MyClass extends mixins(mixinTest1, mixinTest2) { }`.
// .. There's also `MixinsFunc` type for the TS side separately.
export function mixins(...mixins) {
    return mixins.reduce((ExtBase, mixin) => mixin(ExtBase), Object);
}

```

### 7.2. `mixinsWith`

```typescript

// On the JS side, the feature is implemented like this.
// .. Usage: `class MyClass extends mixinsWith(BaseClass, mixinTest1, mixinTest2) { }`.
// .. There's also `MixinsWithFunc` type for the TS side separately.
export function mixinsWith(Base, ...mixins) {
    return mixins.reduce((ExtBase, mixin) => mixin(ExtBase), Base);
}

```

---

## 8. TYPESCRIPT TOOLS

- As is obvious from the implementations of `mixins` and `mixinsWith`, the JS side of mixins is trivial.
- The magic happens on the TS side, and sometimes you might need to use the TS tools specifically.

### 8.1. Simple TS helpers

```typescript

// Array tools.
/** Check if a tuple contains the given value type. */
type IncludesValue<Arr extends any[], Val extends any> = { [Key in keyof Arr]: Arr[Key] extends Val ? true : false }[number] extends false ? false : true;

// Iterators.
/** Iterate down from 20 to 0. If iterates at 0 returns never. If higher than 20, returns 0. (With negative or other invalid returns all numeric options type.)
 * - When used, should not input negative, but go down from, say, `Arr["length"]`, and stop after 0.
 */
type IterateBackwards = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, ...0[]];
/** Iterate up from 0 to 20. If iterates at 20 or higher returns never. (With negative or other invalid returns all numeric options type.)
 * - When used, should not input negative, but go up from 0 until `Arr["length"]`.
 */
type IterateForwards = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, ...never[]];

// Class tools.
/** Get the type for class constructor arguments. */
type GetConstructorArgs<T> = T extends new (...args: infer U) => any ? U : never;
/** Get the type for class constructor return. */
type GetConstructorReturn<T> = T extends new (...args: any[]) => infer U ? U : never;
/** Get the type for class from class instance - the opposite of `InstanceType`. Optionally define constructor args. */
type ClassType<T = {}, Args extends any[] = any[]> = new (...args: Args) => T;

```

### 8.2. Mixin TS helpers: `AsClass<Class, Instance, ConstructorArgs?>`

```typescript

// - Arguments - //

type AsClass<
    Class, // Should refer to the type of the merged class type. For fluency type is any.
    Instance, // Should refer to the type of the merged class instance.
    // Optional. Can be used to define type constructor arguments for the resulting class.
    ConstructorArgs extends any[] = any[]
> = new (...args: ConstructorArgs): Instance & { ["constructor"]: AsClass<Class, Instance, ConstructorArgs>; };


// - Example - //

// Declare type.
type MyClassType = AsClass<{ SOMETHING_STATIC: number; }, { instanced: boolean; }, [one: number, two?: boolean]>;

// Fake a class and instance on JS side.
const MyClass = class MyClass { } as unknown as MyClassType;
const myClass = new MyClass(5); // Constructor requires: [one: number, two?: boolean]

// Do some funky tests.
MyClass.SOMETHING_STATIC; // number
myClass.instanced; // boolean
myClass.constructor.SOMETHING_STATIC; // number
const mySubClass = new myClass.constructor(0, true);
mySubClass.instanced // boolean;
mySubClass.constructor.SOMETHING_STATIC; // number;

```

### 8.3. Mixin TS helpers: `AsInstance<Instance, ConstructorArgs?, Class?>`

```typescript

// - Arguments - //

type AsInstance<
    Instance extends Object, // The instance to re-instance.
    // Optional args.
    ConstructorArgs extends any[] = any[],
    Class = Instance["constructor"]
> = Instance & { ["constructor"]: AsClass<Class, Instance, ConstructorArgs>; }


// - Example - //

// As an alternative to this:
interface MyThing<Info = {}> extends Test1, Test2<Info>, MyBase {}
// You can do this:
interface MyThing<Info = {}> extends AsInstance<Test1 & Test2<Info> & MyBase> {}


```

- Note that in many cases with actual mixins, you can use `MixinsInstance` instead (inferring the types from the mixin functions).
     * Though, the functionality of `AsInstance` has nothing to do with mixins. Internally uses `AsClass`.
- The only reasons why you might need / want to use `AsInstance` are:
     1. To cut redefine the "constructor" to get rid of error about conflicting extends (for the interface).
     2. To help cut excessive deepness in certain use cases with matching class.
     3. As an instance based alternative to `AsClass` - although typescript won't read constructor args from the instance.


### 8.4. Mixin TS helpers: `AsMixin<MixinInstance>`

```typescript

// - Arguments - //

type AsMixin<
    // Just the instance type of the mixin class.
    // .. If reading from the mixin func: `InstanceType<ReturnType<typeof mixinMyTest>>`
    // .. But most often more like: `MyTest<SomeInfo>`, where MyTest is interface (and class).
    MixinInstance extends Object
> = <TBase extends ClassType>(Base: TBase) =>
    Omit<TBase, "new"> & { new (...args: GetConstructorArgs<MixinInstance["constructor"]>): GetConstructorReturn<TBase> & MixinInstance; };


// - Example - //

// Let's first examine a simple mixin with generic params.
// .. It works fine, until things become more complex: you get problems with excessive deepness of types.
const mixinMyTest_Simple = <Info = {}>(Base: Base) => class MyTest extends Base {
    feedInfo(info: Info): void {}
}

// To provide a mixin base without problems of deepness we can do the following.
// .. Let's explicitly type what mixinMyTest returns to help typescript.
interface MyTest<Info = {}> { feedInfo(info: Info): void; }
function mixinMyTest<Info = {}, BaseClass extends ClassType = ClassType>(Base: BaseClass): ClassType<MyTest<Info>> {
    return class MyTest extends Base {
        feedInfo(info: Info): void {}
    }
}

// The annoyance with above is that we lose automated typing of the BaseClass.
// .. AsMixin simply provides a way to automate the typing of the base class.
type MyInfo = { something: boolean; };
class MyMix1 extends mixinMyTest<MyInfo, typeof MyBase>(MyBase) { } // Needs to specify the base type explicitly here.
class MyMix2 extends (mixinMyTest as AsMixin<MyTest<MyInfo>>)(MyBase) { } // Get MyBase type dynamically.

```

### 8.5. Mixin TS helpers: `ValidateMixins<Mixins, BaseClass?>`

```typescript

// - Arguments - //

type ValidateMixins<
    Mixins extends Array<any>,
    // Optional. Can be used to define type of the base class.
    BaseClass extends ClassType = ClassType
> = UnknownComplexProcess;


// - Example - //

// Create mixins.
const mixinTest1 = <Info = {}>(Base: ClassType) => class Test1 extends Base {
    testMe(testInfo: Info): void {}
}
const mixinTest2 = <Info = {}>(Base: ReturnType<typeof mixinTest1<Info>>) =>
    class Test2 extends Base { }

// Create shortcuts for our tests below.
type MyInfo = { test: boolean; };
type Test1 = typeof mixinTest1<MyInfo>;
type Test2 = typeof mixinTest2<MyInfo>;

// Do some tests.
type EvalMixins1 = ValidateMixins<[Test1]>; // [typeof mixinTest1<MyInfo>]
type EvalMixins2 = ValidateMixins<[Test2]>; // [never]
type EvalMixins3 = ValidateMixins<[Test1, Test2]>; // [typeof mixinTest1<MyInfo>, typeof mixinTest2<MyInfo>]
type EvalMixins4 = ValidateMixins<[Test2, Test1]>; // [never, typeof mixinTest1<MyInfo>]
type IsChain3Invalid = IncludesValue<EvalMixins3, never>; // false
type IsChain4Invalid = IncludesValue<EvalMixins4, never>; // true

// Funkier tests.
type EvalMixins5 = ValidateMixins<[Test1, Test2, "string"]>; // [..., never]
type EvalMixins6 = ValidateMixins<[Test1, Test2, () => {}]>; // [..., never]
type EvalMixins7 = ValidateMixins<[Test1, Test2, (Base: ClassType) => ClassType ]>; // All ok.


```

### 8.6. Mixin TS helpers: `MergeMixins<Mixins, ConstructorArgs?, Class?, Instance?>`
- Intersect mixins to a new clean class. The core method for the variants.
- Note that if the mixins contain dependencies of other mixins, should type the dependencies fully to avoid unknown. See below.

```typescript

// - Arguments - //

type MergeMixins<
    Mixins extends Array<(Base: ClassType) => ClassType>,
    // Optional. Define ConstructorArgs, defaults to the args of the _last mixin_.
    ConstructorArgs extends any[] = UnknownProcessToGetLastMixinArgs,
    // Optional. Can be used to define the type of the Base class.
    Class extends Object = {},
    Instance extends Object = {},
> = UnknownComplexProcess;


// - Example - //

// Create mixins.
const mixinTest1 = <Info = {}>(Base: ClassType) => class Test1 extends Base {
    testMe(testInfo: Info): void {}
}
const mixinTest2 = <Info = {}>(Base: ReturnType<typeof mixinTest1<Info>>) => class Test2 extends Base {
    static STATIC_ONE = 1;
}
const mixinTest3 = (Base: ClassType) => class Test3 extends Base {
    name: string = "";
}

// Merge the types manually.
type MyInfo = { test: boolean; };
type Mixins = [typeof mixinTest1<MyInfo>, typeof mixinTest2<MyInfo>, typeof mixinTest3]; // Pass the MyInfo to all that need it.
type MergedClassType = MergeMixins<Mixins>;

// Extra. MergeMixins does not evaluate the chain. Do it with ValidateMixins.
type IsChainInvalid = IncludesValue<ValidateMixins<Mixins>, never>; // false
type IsChainInvalidNow = IncludesValue<ValidateMixins<[Mixins[1], Mixins[0], Mixins[2]]>, never>; // true

// Fake a class.
const MergedClass = class MergedClass { } as unknown as MergedClassType;
const mergedClass = new MergedClass();

// Do funky tests.
mergedClass.testMe({ test: false });
mergedClass.testMe({ test: 5 }); // Fails - "test" is red-underlined. It's `unknown` if MyInfo only passed to mixinTest1 or mixinTest2, not both.
mergedClass.constructor.STATIC_ONE; // number
mergedClass.name = "Mergy";

```

### Mixin TS helpers: `MixinsInstance<Mixins, ConstructorArgs?>`
- Uses MergeMixins (see its notes) but returns the instance type. Useful for creating a class interface.

```typescript

// - Arguments - //

type MixinsInstance<
    Mixins extends Array<(Base: ClassType) => ClassType>,
    // Optional. Define ConstructorArgs, defaults to the args of the _last mixin_.
    ConstructorArgs extends any[] = UnknownProcessToGetLastMixinArgs
> = InstanceType<MergeMixins<Mixins, ConstructorArgs>>;


// - Example - //

// 0. Create a mixin.
const mixinTest1 = <Info = {}>(Base: ClassType) => class Test1 extends Base {
    num: number = 5;
    testMe(testInfo: Info): void {}
}
// .. Optionally collect mixins to a shortcut.
type MyTests = [typeof mixinTest1<Info>];

// 1. Create a mixed class.
class MyClass<Info extends Record<string, any> = {}> extends (mixins(mixinTest1) as ClassType) {
    myMethod(key: keyof Info & string): number {
        return this.num; // `num` is a recognized class member.
    }
}

// 2. Create a matching interface extending what we actually want to extend.
interface MyClass<Info extends Record<string, any> = {}> extends MixinsInstance<MyTests> { }

// Test.
type MyInfo = { something: boolean; };
const myClass = new MyClass<MyInfo>();
myClass.testMe({ something: false }); // Requires `MyInfo`.
const value = myClass.myMethod("something"); // Requires `keyof MyInfo & string`. Returns `number`.
myClass.num === value; // The type is `boolean`, and outcome `true` on JS side.


```

### Mixin TS helpers: `MergeMixinsWith<BaseClass, Mixins, ConstructorArgs?>`
- Exactly like MergeMixins (see its notes) but allows to input the class type of the base class for the mixin chain.

```typescript

// - Arguments - //

type MergeMixinsWith<
    BaseClass extends ClassType,
    Mixins extends Array<(Base: ClassType) => ClassType>,
    // Optional. Define ConstructorArgs, defaults to the args of the _last mixin_.
    ConstructorArgs extends any[] = UnknownProcessToGetLastMixinArgs
> = MergeMixins<Mixins, ConstructorArgs, BaseClass, InstanceType<BaseClass>>;


// - Example - //

class MyBaseClass { }
type MyBaseMix = MergeMixinsWith<typeof MyBaseClass, MyTestsArray>;

```

### 8.7. Mixin TS helpers: `MixinsInstanceWith<BaseClass, Mixins, ConstructorArgs?>`
- Exactly like MergeMixinsWith (see its notes) but returns the instance type. Useful for creating a class interface.

```typescript

// - Arguments - //

type MixinsInstanceWith<
    BaseClass extends ClassType,
    Mixins extends Array<(Base: ClassType) => ClassType>,
    // Optional. Define ConstructorArgs, defaults to the args of the _last mixin_.
    ConstructorArgs extends any[] = UnknownProcessToGetLastMixinArgs
> = InstanceType<MergeMixins<Mixins, ConstructorArgs, BaseClass, InstanceType<BaseClass>>>;


// - Example - //

// 0. Create a base class and a mixin.
class MyBase<Info = {}> {
    static STATIC_ONE = 1;
    testInfo(info: Info): void {}
}
const mixinTest1 = (Base: ClassType) => class Test1 extends Base {
    someMember: number = 5;
}

// 1. Create a mixed class.
class MyClass<Info extends Record<string, any> = {}> extends (mixinsWith(MyBase, mixinTest1) as ClassType) {
    myMethod(key: keyof Info & string): number {
        return this.someMember; // `someMember` is a recognized class member.
    }
}

// 2. Create a matching interface extending what we actually want to extend.
interface MyClass<Info extends Record<string, any> = {}>
    extends MixinsInstanceWith<typeof MyBase<Info>, [typeof mixinTest1]> { }

// Test the result, and prove the claim in step 2.
type MyInfo = { something: boolean; };
const myClass = new MyClass<MyInfo>();
const value = myClass.myMethod("something"); // Requires `keyof MyInfo & string`. Returns `number`.
myClass.testInfo({ something: true });// Requires `MyInfo`.
myClass.someMember = 3; // Requires `number`.
myClass.constructor.STATIC_ONE; // number

```

### 8.8. Mixin TS funcs: `MixinsFunc<Mixins>` and `MixinsWithFunc<Base, Mixins>`
- These are simply the types for the `mixins` and `mixinsWith` JS functions for reusing the same type logic.

```typescript

// - Arguments - //

// For `mixins` function.
type MixinsFunc = <
    Mixins extends Array<(Base: ClassType) => ClassType>
>(...mixins: ValidateMixins<Mixins>) => MergeMixins<Mixins>;

// For `mixinsWith` function.
type MixinsWithFunc = <
    Base extends ClassType,
    Mixins extends Array<(Base: ClassType) => ClassType>
>(Base: Base, ...mixins: ValidateMixins<Mixins, Base>) => MergeMixinsWith<Base, Mixins>;


```

---

## 9. SHORTCUT - 2 SIMPLE TYPES TO SOLVE IT ALL
- In practice, you often might just need two very simple types from the library: `ClassType` and `AsClass`.
- In case they are all you need, you might just as well copy them to your types, as they are very simple.

```typescript

/** Get class type from class instance type with optional constr. args. The opposite of `InstanceType`. */
type ClassType<T = {}, Args extends any[] = any[]> = new (...args: Args) => T;

/** Re-type class.
 * Parameters and return:
 * @param Class Type of the merged class type. (Optionally extends ClassType.)
 * @param Instance Type of the merged class instance. (Optionally extends Object.)
 * @param ConstructorArgs Constructor arguments of the new class. Defaults to any[].
 * @returns The returned type is a new class type, with recursive class <-> instance support.
 */
type AsClass<Class, Instance, ConstructorArgs extends any[] = any[]> = Omit<Class, "new"> & {
    // The ["constructor"] part is optional, but provides a typed link to the static side and back recursively.
    new (...args: ConstructorArgs): Instance & { ["constructor"]: AsClass<Class, Instance, ConstructorArgs>; };
};

```

[Back to top](#what)
