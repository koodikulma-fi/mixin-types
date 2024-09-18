
## WHAT

`easy-mix` provides two simple JS functions (Mixins and MixinsWith) to handle mixins, and related TS tools supporting easy generic typing.

The npm package can be found with: [easy-mix](https://www.npmjs.com/package/easy-mix). Contribute in GitHub: [koodikulma-fi/easy-mix.git](https://github.com/koodikulma-fi/easy-mix.git)

---

## Mixins function

- Helper to create a mixed class from a sequence of mixins in ascending order: [FirstMixin, SecondMixin, ...].
- The typeguard evaluates each mixin up to 20 individually (by mixin form and implied requirements), the rest is not evaluated.
- Note that in cases where mixins are dependent on each other and support type arguments, provide them for all in the chain.

### Basic usage

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

```

### Passing generic parameters

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

### About mixing manually

```typescript

// If you use the above mixins manually, you get two problems (that's why `Mixins` function exists).
// 1. The result won't give you the combined type. Though you could use MergeMixins or ReClassify type to re-type it.
// 2. You get problems with intermediate steps in the chain.
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

### Actual JS implementation

```typescript

// On the JS side, the feature is implemented like this.
export function MixinsWith(...mixins) {
    let Base = Object;
    for (const mixin of mixins)
        Base = mixin(Base);
    return Base;
}

```

---

## MixinsWith function

- Helper to create a mixed class with a base class and a sequence of mixins in ascending order: [Base, FirstMixin, SecondMixin, ...].
- The typeguard evaluates each mixin up to 20 individually (by mixin form and implied requirements), the rest is not evaluated.
- Note that in cases where mixins are dependent on each other and support type arguments, provide them for all in the chain, including the base class.

### Basic usage

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
const addMixin3 = <Info = {}>(Base: ReturnType<typeof addMixin2<Info>>) =>
    class Mixin3 extends Base { }

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

```

### Passing generic parameters

```typescript

// You might want to pass the Info arg further to a mixed base, but TS won't allow it. 
// .. In the lines below, both <Info> are red-underlined, as base class expressions cannot ref. class type params.
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

### About mixing manually

```typescript

// If you use the above mixins and base class manually, you get two problems (that's why `MixinsWith` function exists).
// 1. The result won't give you the combined type. Though you could use MergeMixins or ReClassify type to re-type it.
// 2. You get problems with intermediate steps in the chain.
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

### Actual JS implementation

```typescript

// On the JS side, the feature is implemented like this.
export function MixinsWith(Base, ...mixins) {
    for (const mixin of mixins)
        Base = mixin(Base);
    return Base;
}

```

---

## TypeScript tools

- As is obvious from the implementations, the JS side of things is trivial.
- The magic happens on the TS side, and sometimes you might need to use the TS tools specifically.

### Simple TS helpers

```typescript

// Array tools.
/** Check if a tuple contains the given value type. */
export type IncludesValue<Arr extends any[], Val extends any> = { [Key in keyof Arr]: Arr[Key] extends Val ? true : false }[number] extends false ? false : true;

// Iterators.
/** Iterate down from 20 to 0. If iterates at 0 returns never. If higher than 20, returns 0. (With negative or other invalid returns all numeric options type.)
 * - When used, should not input negative, but go down from, say, `Arr["length"]`, and stop after 0.
 */
export type IterateBackwards = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, ...0[]];
/** Iterate up from 0 to 20. If iterates at 20 or higher returns never. (With negative or other invalid returns all numeric options type.)
 * - When used, should not input negative, but go up from 0 until `Arr["length"]`.
 */
export type IterateForwards = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, ...never[]];

// Class tools.
/** Get the type for class constructor arguments. */
export type GetConstructorArgs<T> = T extends new (...args: infer U) => any ? U : never;
/** Get the type for class constructor return. */
export type GetConstructorReturn<T> = T extends new (...args: any[]) => infer U ? U : never;
/** Get the type for class from class instance - the opposite of `InstanceType`. Optionally define constructor args. */
export type ClassType<T = {}, Args extends any[] = any[]> = new (...args: Args) => T;

```

### Mixin TS helpers: ReClassify

```typescript

// - Arguments - //

export type ReClassify<
    Class, // Should refer to the type of the merged class type. For fluency type is any.
    Instance, // Should refer to the type of the merged class instance.
    // Optional. Can be used to define type constructor arguments for the resulting class.
    ConstructorArgs extends any[] = any[]
> = SomeComplexProcess;


// - Example - //

// Declare type.
type MyClassType = ReClassify<{ SOMETHING_STATIC: number; }, { instanced: boolean; }, [one: number, two?: boolean]>;

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

### Mixin TS helpers: EvaluateMixinChain

```typescript

// - Arguments - //

export type EvaluateMixinChain<
    Mixins extends Array<any>,
    // Optional. Can be used to define type of the base class.
    BaseClass extends ClassType = ClassType
> = SomeComplexProcess;


// - Example - //

// Create mixins.
const addMixin1 = <Info extends any = {}>(Base: ClassType) => class Mixin1 extends Base {
    testMe(testInfo: Info): void {}
}
const addMixin2 = <Info extends any = {}>(Base: ReturnType<typeof addMixin1<Info>>) =>
    class Mixin2 extends Base { }

// Create shortcuts for our tests below.
type MyInfo = { test: boolean; };
type Mixin1 = typeof addMixin1<MyInfo>;
type Mixin2 = typeof addMixin2<MyInfo>;

// Do some tests.
type EvalMixins1 = EvaluateMixinChain<[Mixin1]>; // [typeof addMixin1<MyInfo>]
type EvalMixins2 = EvaluateMixinChain<[Mixin2]>; // [never]
type EvalMixins3 = EvaluateMixinChain<[Mixin1, Mixin2]>; // [typeof addMixin1<MyInfo>, typeof addMixin2<MyInfo>]
type EvalMixins4 = EvaluateMixinChain<[Mixin2, Mixin1]>; // [never, typeof addMixin1<MyInfo>]
type IsChain3Invalid = IncludesValue<EvalMixins3, never>; // false
type IsChain4Invalid = IncludesValue<EvalMixins4, never>; // true

// Funkier tests.
type EvalMixins5 = EvaluateMixinChain<[Mixin1, Mixin2, "string"]>; // [..., never]
type EvalMixins6 = EvaluateMixinChain<[Mixin1, Mixin2, () => {}]>; // [..., never]
type EvalMixins7 = EvaluateMixinChain<[Mixin1, Mixin2, (Base: ClassType) => ClassType ]>; // All ok.


```

### Mixin TS helpers: `MergeMixins<Mixins, Class?, Instance?>`
- Intersect mixins to a new clean class.
- Note that if the mixins contain dependencies of other mixins, should type the dependencies fully to avoid unknown. See below.

```typescript

// - Arguments - //

type MergeMixins<
    Mixins extends Array<(Base: ClassType) => ClassType>,
    // Optional. Can be used to define the type of the Base class.
    Class extends Object = {},
    Instance extends Object = {},
> = SomeComplexProcess;


// - Example - //

// Create mixins.
const addMixin1 = <Info extends any = {}>(Base: ClassType) => class Mixin1 extends Base {
    testMe(testInfo: Info): void {}
}
const addMixin2 = <Info extends any = {}>(Base: ReturnType<typeof addMixin1<Info>>) => class Mixin2 extends Base {
    static STATIC_ONE = 1;
}
const addMixin3 = (Base: ClassType) => class Mixin3 extends Base {
    name: string = "";
}

// Merge the types manually.
type MyInfo = { test: boolean; };
type Mixins = [typeof addMixin1<MyInfo>, typeof addMixin2<MyInfo>, typeof addMixin3]; // Pass the MyInfo to all that need it.
type MergedClassType = MergeMixins<Mixins>;

// Extra. MergeMixins does not evaluate the chain. Do it with EvaluateMixinChain.
type IsChainInvalid = IncludesValue<EvaluateMixinChain<Mixins>, never>; // false
type IsChainInvalidNow = IncludesValue<EvaluateMixinChain<[Mixins[1], Mixins[0], Mixins[2]]>, never>; // true

// Fake a class.
const MergedClass = class MergedClass { } as unknown as MergedClassType;
const mergedClass = new MergedClass();

// Do funky tests.
mergedClass.testMe({ test: false });
mergedClass.testMe({ test: 5 }); // Fails - "test" is red-underlined. It's `unknown` if MyInfo only passed to addMixin1 or addMixin2, not both.
mergedClass.constructor.STATIC_ONE; // number
mergedClass.name = "Mergy";

```

### Mixin TS helpers: `MixinsInstance<Mixins, Class?, Instance?>`
- Exactly like MergeMixins (see its notes) but returns the instance type. Useful for creating a class interface.

```typescript

// - Arguments - //

export type MixinsInstance<
    Mixins extends Array<(Base: ClassType) => ClassType>,
    // Optional. Can be used to define the type of the Base class.
    Class extends Object = {},
    Instance extends Object = {},
> = InstanceType<MergeMixins<Mixins, Class, Instance>>;


// - Example - //

// 0. Create a mixin.
const addMixin1 = <Info = {}>(Base: ClassType) => class Mixin1 extends Base {
    num: number = 5;
    testMe(testInfo: Info): void {}
}

// 1. Create a mixed class.
class MyClass<Info extends Record<string, any> = {}> extends (Mixins(addMixin1) as ClassType) {
    myMethod(key: keyof Info & string): number {
        return this.num; // `num` is a recognized class member.
    }
}

// 2. Create a matching interface extending what we actually want to extend.
interface MyClass<Info extends Record<string, any> = {}>
    extends MixinsInstance<[typeof addMixin1<Info>]> { }

// Test.
type MyInfo = { something: boolean; };
const myClass = new MyClass<MyInfo>();
myClass.testMe({ something: false }); // Requires `MyInfo`.
const value = myClass.myMethod("something"); // Requires `keyof MyInfo & string`. Returns `number`.
myClass.num === value; // The type is `boolean`, and outcome `true` on JS side.


```

### Mixin TS helpers: `MergeMixinsWith<BaseClass, Mixins>`
- Exactly like MergeMixins (see its notes) but allows to input the class type of the base class for the mixin chain.

```typescript

// - Arguments - //

export type MergeMixinsWith<
    BaseClass extends ClassType,
    Mixins extends Array<(Base: ClassType) => ClassType>
> = MergeMixins<Mixins, BaseClass, InstanceType<BaseClass>>;


// - Example - //

class MyBaseClass { }
type MyBaseMix = MergeMixinsWith<typeof MyBaseClass, MyMixinsArray>;

```

### Mixin TS helpers: `MixinsInstanceWith<BaseClass, Mixins>`
- Exactly like MergeMixinsWith (see its notes) but returns the instance type. Useful for creating a class interface.

```typescript

// - Arguments - //

export type MixinsInstanceWith<
    BaseClass extends ClassType,
    Mixins extends Array<(Base: ClassType) => ClassType>
> = InstanceType<MergeMixins<Mixins, BaseClass, InstanceType<BaseClass>>>;


// - Example - //

// 0. Create a base class and a mixin.
class MyBase<Info = {}> {
    static STATIC_ONE = 1;
    testInfo(info: Info): void {}
}
const addMixin1 = (Base: ClassType) => class Mixin1 extends Base {
    someMember: number = 5;
}

// 1. Create a mixed class.
class MyClass<Info extends Record<string, any> = {}> extends (MixinsWith(MyBase, addMixin1) as ClassType) {
    myMethod(key: keyof Info & string): number {
        return this.someMember; // `someMember` is a recognized class member.
    }
}

// 2. Create a matching interface extending what we actually want to extend.
interface MyClass<Info extends Record<string, any> = {}>
    extends MixinsInstanceWith<typeof MyBase<Info>, [typeof addMixin1]> { }

// Test the result, and prove the claim in step 2.
type MyInfo = { something: boolean; };
const myClass = new MyClass<MyInfo>();
const value = myClass.myMethod("something"); // Requires `keyof MyInfo & string`. Returns `number`.
myClass.testInfo({ something: true });// Requires `MyInfo`.
myClass.someMember = 3; // Requires `number`.
myClass.constructor.STATIC_ONE; // number

```
