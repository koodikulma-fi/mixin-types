
## WHAT

`mixin-types` provides typing tools related to mixins as well as two simple JS functions (`Mixins` and `MixinsWith`).

The npm package can be found with: [mixin-types](https://www.npmjs.com/package/mixin-types). Contribute in GitHub: [koodikulma-fi/mixin-types.git](https://github.com/koodikulma-fi/mixin-types.git)

The documentation below explains how to set up and use mixins in various circumstances.
1. General guidelines
2. Simple mixins
3. Passing generic params from class (to simple mixins)
4. Complex mixins and generic parameters
5. Constructor arguments
6. Using `instanceof`
7. Shortcut (2 types to solve it all)

---

## 1. GENERAL GUIDELINES
- For a clean overall mixin architecture, keep the purpose of each mixin simple and detached from each other.
- If a mixin is dependent on another mixin, consider _including_ it, instead of _requiring_ it.
    * For example: `addMyBigMixin = (Base) => return class MyBigMixin extends addMySmallMixin(Base) { ... }`.
- Keep constructor arguments clean and minimal (and their count fixed), or preferably don't use them at all.
- Finally, use mixins as simple base blocks to create your "final" classes. Don't use mixins excessively.
- That said, mixins can be wonderfully useful and provide an easy way to avoid writing same code many times.

---

## 2. SIMPLE MIXINS

- For sequencing many mixins together, use the `Mixins` and `MixinsWith` methods.

### Using `Mixins` (for a sequence of mixins)

```typescript

// Create mixins.
const addMixin1 = <Info = {}>(Base: ClassType) => class Mixin1 extends Base {
    num: number = 5;
    testMe(testInfo: Info): void {}
}
const addMixin2 = (Base: ClassType) => class Mixin2 extends Base {
    name: string;
}
const addMixin3 = <Info = {}>(Base: ReturnType<typeof addMixin1<Info>>) => class Mixin3 extends Base { }

// Create a mixed class.
// .. Provide MyInfo systematically to all that use it. Otherwise you get `unknown` for the related type.
type MyInfo = { something: boolean; };
class MyMix extends Mixins(addMixin1<MyInfo>, addMixin2, addMixin3<MyInfo>) {
    test() {
        this.testMe({ something: true }); // Requires `MyInfo`.
        this.name = "Mixy"; // Requires `string`.
        this.num; // number;
    }
}

// Test failure.
// .. addMixin3 is red-underlined (not assignable to `never`) as it requires addMixin1.
class MyFail extends Mixins(addMixin3) { }

// If you use the above mixins manually, you get two problems (that's why `Mixins` function exists).
// 1. The result won't give you the combined type. Though you could use MergeMixins or AsClass type to re-type it.
// 2. You get problems with intermediate steps in the chain - unless you specifically want it.
// +  The core reason for these problems is that each pair is evaluated separately, not as a continuum.
//
class MyManualMix extends addMixin3<MyInfo>(addMixin2(addMixin1<MyInfo>(Object))) {
    // In the above line `addMixin2(...)` is red-underlined, because it doesn't fit `addMixin3`'s argument about requiring `addMixin1`.
    test() {
        this.testInfo({ something: false }); // testInfo red-underlined because not existing.
        this.someMember = 8; // someMember is red-underlined because because not existing.
        this.enabled; // enabled is red-underlined because because not existing.
    }
}

```

### Using `MixinsWith` (for a mixin sequence with a base class)

```typescript

// Create a base class and some mixins.
class MyBase<Info = {}> {
    static STATIC_ONE = 1;
    testInfo(info: Info): void {}
}
const addMixin1 = (Base: ClassType) => class Mixin1 extends Base {
    someMember: number = 5;
}
const addMixin2 = <Info = {}>(Base: typeof MyBase<Info>) => class Mixin2 extends Base {
    enabled: boolean = false;
}
const addMixin3 = <Info = {}>(Base: ReturnType<typeof addMixin2<Info>>) => class Mixin3 extends Base { }

// Create a mixed class.
// .. Provide MyInfo systematically to all that use it. Otherwise you get `unknown` for the related type.
type MyInfo = { something: boolean; };
class MyMix extends MixinsWith(MyBase<MyInfo>, addMixin1, addMixin2<MyInfo>, addMixin3<MyInfo>) {
    test() {
        this.testInfo({ something: false }); // Requires `MyInfo`.
        this.someMember = 8; // Requires `number`.
        this.enabled; // boolean;
    }
}

// Test failure.
// .. addMixin2 is red-underlined as it requires MyBase, Object is not enough.
class MyFail extends MixinsWith(Object, addMixin2) { }

// If you use the above mixins and base class manually, you get two problems (that's why `MixinsWith` function exists).
// 1. The result won't give you the combined type. Though you could use MergeMixins or AsClass type to re-type it.
// 2. You get problems with intermediate steps in the chain - unless you specifically want it.
// +  The core reason for these problems is that each pair is evaluated separately, not as a continuum.
//
class MyManualMix extends addMixin3<MyInfo>(addMixin2<MyInfo>(addMixin1(MyBase<MyInfo>))) {
    // In the above line `addMixin1(...)` is red-underlined, because it doesn't fit `addMixin2`'s argument about requiring `Base`.
    test() {
        this.testInfo({ something: false }); // Requires `MyInfo`. // It's correct.
        this.someMember = 8; // someMember is red-underlined because because not existing.
        this.enabled; // boolean; // It's correct.
    }
}

```

## 3. PASSING GENERIC PARAMETERS FROM CLASS (TO SIMPLE MIXINS)
- To pass in generic parameters from a class, there's an inherent problem: _Base class expressions cannot reference class type parameters_.
- This problem can be overcome using the trick of declaring a matching `interface` for the new `class`.

### Using `Mixins` and `MixinsInstance`

```typescript

// You might want to pass the Info arg further to a mixed base, but TS won't allow it. 
// .. In the lines below, <Info> is red-underlined, as base class expressions cannot ref. class type params.
class MyClass_Wish<Info extends Record<string, any> = {}> extends Mixins(addMixin1<Info>) { }
class MyClass_Wish_Manual<Info extends Record<string, any> = {}> extends addMixin1<Info>(Object) { }

// So instead do to this.
// 1. Create a class extending addMixin using `as ClassType` to loosen the base class type.
// .. Remarkably, _after_ setting up the interface below, we do have access to the base class even inside the extending class.
//
class MyClass<Info extends Record<string, any> = {}> extends (Mixins(addMixin1) as ClassType) {
    myMethod(key: keyof Info & string): number { return this.num; } // `num` is a recognized class member.
}
// 2. Create a matching interface extending what we actually want to extend.
// .. Another remarkable thing is that there's no need to actually retype the class in the interface.
//
interface MyClass<Info extends Record<string, any> = {}> extends MixinsInstance<[typeof addMixin1<Info>]> { }
// .. The line below would work equally well for a single mixin case like this.
// interface MyClass<Info extends Record<string, any> = {}> extends InstanceType<ReturnType<typeof addMixin1<Info>>> { }

// Test the result, and prove the claim in step 2.
const myClass = new MyClass<MyInfo>();
myClass.testMe({ something: false }); // Requires `MyInfo`.
const value = myClass.myMethod("something"); // Requires `keyof MyInfo & string`. Returns `number`.
myClass.num === value; // The type is `boolean`, and outcome `true` on JS side.

```

### Using `MixinsWith` and `MixinsInstanceWith`

```typescript

// You might want to pass the Info arg further to a mixed base, but TS won't allow it. 
// .. In the lines below, the <Info>s are red-underlined, as base class expressions cannot ref. class type params.
class MyClass_Wish<Info extends Record<string, any> = {}> extends MixinsWith(MyBase<Info>, addMixin1) { }
class MyClass_Wish_Manual<Info extends Record<string, any> = {}> extends addMixin1(MyBase<Info>) { }

// So instead do to this.
// 1. Create a class extending addMixin using `as ClassType` to loosen the base class type.
// .. Remarkably, _after_ setting up the interface below, we do have access to the base class even inside the extending class.
//
class MyClass<Info extends Record<string, any> = {}> extends (MixinsWith(MyBase, addMixin1) as ClassType) {
    myMethod(key: keyof Info & string): number { return this.someMember; } // `someMember` is a recognized class member.
}

// 2. Create a matching interface extending what we actually want to extend.
// .. Another remarkable thing is that there's no need to actually retype the class in the interface. Just declare it.
//
interface MyClass<Info extends Record<string, any> = {}>
    extends MixinsInstanceWith<typeof MyBase<Info>, [typeof addMixin1]> { }

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

### 1. Excessive deepness -> explicit typing
- Firstly, to overcome the problem of excessive deepness of the types, the solution is to use explicit typing.
- So the mixin function itself should define explicitly what it returns, so that typescript won't have to interpret it from the code.

```typescript

// - Class - //

// Some internal typing.
export type SignalsRecord = Record<string, (...args: any[]) => void>;

// Let's declare SignalBoy class using private untyped `_addSignalBoy(Object?: ClassType) => ClassType` as the basis.
export class SignalBoy<Signals extends SignalsRecord = {}> extends _addSignalBoy() { }
// Or alternatively use one mixin but retype with `as any as ClassType`.
// .. Note that it's not enough with `as ClassType` (circularity).
// .. Note also that if we had a base class would still use: `as any as ClassType` here.
// export class SignalBoy<Signals extends SignalsRecord = {}> extends (addSignalBoy() as any as ClassType) { }

// Let's declare the interface with explicit typing.
export interface SignalBoy<Signals extends SignalsRecord = {}> {
    // Optionally further define the static side, for extra external fluency.
    ["constructor"]: SignalBoyType<Signals>;
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

// If _addSignalBoy would refer to SignalBoy (or SignalBoyType) explicitly, there would be a circular reference.
function addSignalBoy_CIRCULAR<Data = {}, TBase extends ClassType = ClassType>(Base: TBase): SignalBoyType<Data> & TBase {
    return class SignalBoy extends Base {
        // ...
    } as any; // Would have to detach here from expected outcome.
}

```

### 2. Avoiding circular references
- To avoid the problem with circularity there are at least 2 main working approaches.
    1. Retype the internal use of the mixin: `class SignalBoy extends (addSignalBoy() as any as ClassType) {}`.
    2. Use a separate private and public mixin. See example below: `class SignalBoy extends _addSignalBoy() {}`.
    3. DON'T: Use a non-class-linked dummy interface: eg. `interface _SignalBoy {}`. It leads to problem of private/unexported interface.


```typescript

// - Mixin (private) - //

// For local use only.
// .. For clarity of usage and avoid problems with deepness, we don't use the <Data> here at all and return ClassType.
function _addSignalBoy(Base?: ClassType): ClassType {
    
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
export function addSignalBoy<
    Signals extends SignalsRecord = {},
    BaseClass extends ClassType = ClassType
>(Base?: BaseClass): SignalBoyType<Signals> & BaseClass {
    // We just use the same internal JS method.
    return _addSignalBoy(Base) as any;
}

// For more complex cases, it's recommended to use the pattern below with AsClass.
/** Add DataBoy features to a base class.
 * - Provide BaseClass type specifically (2nd arg) or use AsMixin type helper.
 */
export function addSignalBoy_ALT<
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
    return _addSignalBoy(Base) as any;
}

```

### 3. Minor issue with losing the type of the base class

- So the above works and there's no circularity and issues with deepness or when used externally.
- The only minor issue is that the `addSignalBoy` above loses the automated BaseClass type from the actual argument.
- This can be overcome externally in two ways: 1. Provide it with `typeof MyBase`, 2. Use `AsMixin` type helper.

```typescript

// 0. MyBase and MySignals.
type MySignals = { test: (num: number) => void; };
class MyBase {
    public name: string = "";
}
// 1. Just type it in using `typeof`.
class MyMix1 extends addSignalBoy<MySignals, typeof MyBase>(MyBase) {}
// 2. Or use `AsMixin` helper type.
class MyMix2 extends (addSignalBoy as AsMixin<SignalBoy<MySignals>>)(MyBase) {}

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
class MyMix<AddSignals extends SignalsRecord = {}> extends (addSignalBoy(MyBase) as ClassType) {
    // Just to define constructor explicitly. In our mixing chain, there's no constructor args.
    constructor() {
        super();
    }
    test() {
        // Use `(this as MyMix<MySignals>)` to get a stable base for Signals used.
        (this as MyMix<MySignals>).sendSignal("test", 1);
    }
}
// .. Interface explicitly typed.
interface MyMix<AddSignals extends SignalsRecord = {}> extends SignalBoy<MySignals & AddSignals>, MyBase { }

// Test.
const myMix = new MyMix<{ sendDescription: (title: string, content: string) => void; }>();
myMix.name = "myMix";
myMix.listenTo("test", num => {});
myMix.listenTo("sendDescription", (title, content) => {});
myMix.sendSignal("sendDescription", "Mixins", "So many things.");
myMix.constructor.DEFAULT_TIMEOUT; // number | null

// And finally, if you need to make MyMix be a mixin in addition to class, just repeat what is done here for SignalBoy.


```

---

## 5. CONSTRUCTOR ARGUMENTS

### Rules of thumb
- Generally speaking, you should prefer _not_ using constructor arguments in mixins.
    * When needed, keep them simple, and use fixed number of arguments (eg. not 1-3 args, but eg. 2).
    * Note also that it's not possible to automate typing for constructor arguments (see the code example below).
    * As it's always the _last mixin / extending class_ that defines the args - and as such, should do it explicitly.
- At the conceptual level, the constructor args of the mix should be defined for each mix explicitly.
    * This can be done either directly to a mix (with `MergeMixins` or `AsClass`) or by extending the mix with a class and use its constructor.
- It's then the responsibility of the sequence composer to make sure the flow makes sense and that constructor args flow as expected.
- And it's the responsibility of individual mixins to keep constuctor args clean, and to always expect unknown arguments to be passed further: `constructor(myStuff: Stuff, ...args: any[]) { super(...args); }`.

### Why cannot the arguments be automated?
- The simple answer is that it's _not known how mixins use the constructor args_.
- The below example demonstrations this point while showcasing how to use constructor arguments.

### Using constructor args

```typescript

// Let's say we have two (simple) mixins: addDataMan, and addDataMonster that requires addDataMan.

// DataMan.
// .. Let's define interfaces for DataMan with two constructor args (data: Data, settings: Settings).
interface DataManType<Data = {}, Settings = {}> extends
    ClassType<DataMan<Data, Settings>, [data: Data, settings: Settings, ...args: any[]]> {}
interface DataMan<Data = {}, Settings = {}> {
    ["constructor"]: DataManType<Data, Settings>; // Link to the static side.
    data: Data;
    settings: Settings;
}
// .. DataMan uses args for (data: Data, settings: Settings) and requires just ClassType base.
function addDataMan<
    Data = {},
    Settings = {},
    TBase extends ClassType = ClassType
>(Base: TBase): DataManType<Data, Settings> & TBase {
    return class DataMan extends Base {
        data: Data;
        settings: Settings;
        // See trick in DataMonster for nice args.
        // .. Then could be: `(data: Data, settings: Settings, ...args: any[])`
        constructor(...args: any[]) {
            super(...args.slice(2));
            this.data = args[0] || {};
            this.settings = args[1] || {};
        }
    } as any; // We have explicitly typed the return.
}

// DataMonster has (stuff: Stuff) as args and requires DataManType.
function addDataMonster<
    Stuff extends Partial<{ data: any; settings: any; }> = {},
    TBase extends DataManType = DataManType<Stuff["data"], Stuff["settings"]>
>(Base: TBase): AsClass<
    DataManType<Stuff["data"], Stuff["settings"]>, // Static.
    DataMan<Stuff["data"], Stuff["settings"]>, // Instanced.
    [stuff?: Stuff, ...args: any[]] // Constructor args.
> {
    // Note. By using `(Base as ClassType)`, we can define constructor args more nicely.
    // .. Otherwise gets error: _A mixin class must have a constructor with a single rest parameter of type 'any[]'._
    return class DataMonster extends (Base as ClassType) {
        constructor(stuff?: Stuff, ...args: any[]) {
            // Remap the args.
            super(stuff?.data, stuff?.settings, ...args);
        }
    } as any; // We have explicitly typed the return.
}

// Finally, as is evident, we cannot just add up the args based on order of mixins.
// .. It's simply always the _last in the chain_ that defines the args, while all pass them on.
type MyStuff = { data: { something: boolean; }; settings: any; };
class MyMonster extends Mixins(addDataMan<MyStuff["data"], MyStuff["settings"]>, addDataMonster<MyStuff>) {
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

## 6. USING `instanceof` WITH MIXINS
- Why it won't "work" the way you might initially expect.
    * As each mixin sequence produces a unique class, you cannot check mixin base classes using `instanceof`.
    * In fact, you don't even have a reference to them (unless you have a separate class prepared).
    * This is a core limitation of mixins when implemented as extensions to native classes.
- Examples of working around.
    * #1 Use mixins only as building blocks to compose the "main classes" and use `instanceof` for them.
    * #2 Manual implementation.
        - Add `static CLASS_NAMES: string[]` member that is required for all mixins (and classes) in your system. Let's call it `BaseClassType`.
        - Each time a mixin extends a class, it should add to its CLASS_NAMES its unique mixin (class) name.
            * Likewise classes would add them on the static side: `static CLASS_NAMES = [...MyBaseClass.CLASS_NAMES, "MyClass"]`.
        - Finally, you'd have a custom function for checking inheritance:
            * `isInstanceOf(Class: BaseClassType, className: string): boolean { return Class.CLASS_NAMES.includes(className); }`.
- It's also worth noting that the larger architectural choices at the conceptual level have reverberations all the way down to these details.
    * For example, questions about using a complex tree of classes with inheritance vs. using a modular structure.
    * In a tree of classes you might use mixins as base building blocks (nor part of the tree), whereas in a more modular structure you wouldn't really use mixins at all for the modules (or again, as base building blocks for modules). This is because, mixins are essentially an alternative (or an implementation) of modularity, although tied to class inheritance: anyway, you just pick your modules, like you pick your mixins.
    * The point here is that, if you have a complex class tree structure, mixing in mixins is not necessarily going to solve the problems, but merely shift their form. That is, you get a new domain of tiny little problems here and there by introducing mixings to a clean class inheritance tree.

---

## 7. SHORTCUT (2 TYPES TO SOLVE IT ALL)
- In practice, you often might just need two very simple types from the library: `ClassType` and `AsClass`.
- In case they are all you need, you might just as well copy them to your types, as they are very simple.

```typescript

/** Get the type for class from class instance - the opposite of `InstanceType`. Optionally define constructor args. */
export type ClassType<T = {}, Args extends any[] = any[]> = new (...args: Args) => T;

/** Re-type class.
 * Parameters and return:
 * @param Class Should refer to the type of the merged class type. For fluency it's not required that it's a ClassType (the "new" part will be omitted anyhow).
 * @param Instance Should refer to the type of the merged class instance.
 * @param ConstructorArgs Should refer to the constructor arguments of the new class (= the last mixin in the chain). Defaults to any[].
 * @returns The returned type is a new class type, with recursive class <-> instance support.
 */
export type AsClass<Class, Instance, ConstructorArgs extends any[] = any[]> = Omit<Class, "new"> & {
    // The ["constructor"] part is optional, but provides a typed link to the static side and back recursively.
    new (...args: ConstructorArgs): Instance & { ["constructor"]: AsClass<Class, Instance, ConstructorArgs>; };
};

```