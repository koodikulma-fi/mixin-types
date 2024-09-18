
## TODO:
- Finish docs.
- Make MERGEMIXINS allow to take CONSTRUCTOR ARGS..! Just pass it along from one to next. Then can go downards too.

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

- For sequencing simple mixins, use the `Mixins` and `MixinsWith` methods.

### Using `Mixins`

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

### Using `MixinsWith`

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
    2. Issues with circular reference when using explicit typing. -> Use a separate core + exported mixin creator.
    3. Minor issue with losing the type of the base class. -> Can use `typeof MyBase` or `AsMixin` helper.

### 1. Excessive deepness -> explicit typing
- Firstly, to overcome the problem of excessive deepness of the types, the solution is to use explicit typing.
- So the mixin function itself should define explicitly what it returns, so that typescript won't have to interpret it from the code.

```typescript

// - Class - //

// Some internal typing.
export type SignalsRecord = Record<string, (...args: any[]) => void>;
// Let's declare SignalBoy class using private untyped `_addSignalBoy(Object?: ClassType) => ClassType` as the basis.
export class SignalBoy<Signals extends SignalsRecord = {}> extends _addSignalBoy() { } // Extends simple ClassType.
// Let's declare the interface with explicit typing.
export interface SignalBoy<Signals extends SignalsRecord = {}> {
    // Optionally further define the static side, for extra external fluency.
    ["constructor"]: SignalBoyType<Signals>;
    // Members.
    signals: Record<string, Array<SignalListener>> = {};
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

### 2. Avoiding circularity using a private and public mixin
- To avoid the problem with circularity above, let's use a private _addSignalBoy that does not refer to the SignalBoy class/interface.
    * Note that want to avoid deepness and anyway extend mere `ClassType`: `class SignalBoy extends (_addSignalBoy() as ClassType) {}`.
    * Accordingly, we can make the _addSignalBoy directly return `ClassType`, to simplify above: `class SignalBoy extends _addSignalBoy {}`.
- We then export a cleaned up `addSignalBoy<Signals>` for the public use of our mixin.
- Sidenote. You might be tempted to instead split the _interface_ (not mixin func) into private/public parts.
    * For example: using `interface _MyMix<Info = {}> { ... }` as the core for MyMix.
    * This works fine, until you use MyMix outside the file, as addMyMix uses a private / unexported interface.
    * You could then export it, but it's just confusing: _MyMix and MyMix interfaces are both there and 100% equal.


```typescript

// - Mixin (private) - //

// For local use only.
// .. For clarity of usage and avoid problems with deepness, we don't use the <Data> here at all and return ClassType.
function _addSignalBoy(Base?: ClassType): ClassType {
    
    // Return extended class using simple non-typed variants inside.
    return class _SignalBoy extends Base {

        public static DEFAULT_TIMEOUT: number | null = 0;
        public signals: Record<string, Array<SignalListener>> = {};

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
>(Base: BaseClass): SignalBoyType<Signals> & BaseClass {
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
>(Base: BaseClass): AsClass<
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
- The only minor issue is that the form of `addSignalBoy` above loses the automated BaseClass type from the actual argument.
- This can be overcome externally in two ways:
    1. Simply provide it by adding `typeof MyBase`.
    2. Or use the `AsMixin` type helper.

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

### Extra - uplifting the above MyMix to have generic parameters

```typescript

// To uplift MyMix to have generic parameters, just define class + interface, like done above.
// .. Class extending ClassType.
class MyMix<AddSignals extends SignalsRecord = {}> extends (SignalBoy(MyBase) as ClassType) {
    // Just to define constructor explicitly. In our mixing chain, there's no constructor args.
    constructor() {
        super();
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

// And finally, if you need to make MyMix be a mixin in addition to class, just repeat what is done here for SignalBoy.


```

---

## 5. CONSTRUCTOR ARGUMENTS
- Generally speaking, you should prefer not using constructor arguments in mixins.
- When you use them, keep them very simple, preferably just taking 1 argument - definitely not say, 1-3 arguments.
- There's also inherentely insolvable cases for trying to automate how constructor arguments map out.
    * The simple answer is that the last mixin in the chain defines the arguments, and it's true (mostly).
    * Even though it's blindly passing on args: `constructor(myStuff: Stuff, ...args: any[]) { super(...args); }`.
    * However it is actually impossible to know the ...args for sure (see case below) at the internal level.
- To solve it all:
    * At the conceptual level, the constructor arguments of the mixed sequence should be defined for each mix explicitly.
        - This can be done either directly to a mix (with MergeMixins or AsClass) or by extending the mix with a class and use its constructor.
    * It's then the responsibility of the mixing master to make sure the sequence makes sense and that the constructor args flow as expected.
        - And it's the responsibility of individual mixins to keep constuctor args simple and clean, and to expect unknown arguments to be passed further: `constructor(myStuff: Stuff, ...args: any[]) { super(...args); }`.
- Note about why it can't be automated?
    * You might be tempted to figure out a way to automate the arguments, but a simple case proves it's not possible - as it's not known how the mixins use the constructor arguments.
    * For example, let's say we have `DataMan<Data, Settings>(data: Data, settings: Settings)`, and `DataMonster<Stuff>(stuff: Stuff)` mixins.
    * And that DataMonster requires DataMan, and expects to feed arguments to it.
    * However DataMonster actually has just one argument `stuff`, which presumably contains `{ data, settings }` that it passes to DataMan.
    * Because of this, the situation is not: `(stuff, data, settings)` but instead `(stuff)`, and it actually makes no difference at all what the previous mixins require.
    * In other words, it's really the last in the mix that decides the constructor args, even though it doesn't actually know what to pass (by definition of a mixin) - and thus, all mixins should just use `(stuff, ...args: any[])` or such and pass them args further down. And, we can not automate the args.

---

## 6. USING `instanceof` WITH MIXINS
- Why it won't "work" the way you might initially expect.
- Examples of working around.
    1. Conceptually, use mixins as tiny building blocks to compose your "main classes" and use instanceof only for them.
    2. Manual implementation.
        - Add static INHERITED_CLASS_NAMES_: string[] member. It's the required basis for all.
        - Each time a mixin extends a class, it should add to its INHERITED_CLASS_NAMES its unique mixin (class) name.
        - Finally, you'd have a custom `isInstanceOf(Class: ClassType, className: string): boolean` method that simply checks the string array for a match.
