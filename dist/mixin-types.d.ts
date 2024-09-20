/** Helper to create a mixed class from a sequence of mixins in ascending order: `[mixinTest1, mixinTest2, ...]`.
 * - The typeguard evaluates each mixin up to 20 individually (by mixin form and implied requirements), the rest is not evaluated.
 * - Note that in cases where mixins are dependent on each other and support type arguments, provide them for all in the chain.
 * - Note that you should likely define constructor arguments by adding a constructor statement on the extending class.
 *      * Alternatively could use `AsMixin`, `AsInstance` or `AsClass` to help with retyping the class with constructor args.
 *      * By default `mixins` simply tries to read them from the last mixin, but that might not be correct (depending on the chain), nor as explicit as liked.
 *
 * ```
 *
 * // - Actual JS implementation - //
 *
 * // On the JS side, the feature is implemented like this.
 * // .. For example: `class MyClass extends mixins(mixinTest1, mixinTest2) { }`.
 * export function mixins(...mixins) {
 *     return mixins.reduce((ExtBase, mixin) => mixin(ExtBase), Object);
 * }
 *
 *
 * // - Basic usage - //
 *
 * // Create mixins.
 * const mixinTest1 = <Info = {}>(Base: ClassType) => class Test1 extends Base { num: number = 5; testMe(testInfo: Info): void {} }
 * const mixinTest2 = (Base: ClassType) => class Test2 extends Base { name: string = ""; }
 * const mixinTest3 = <Info = {}>(Base: ReturnType<typeof mixinTest1<Info>>) => class Test3 extends Base { }
 *
 * // Create a mixed class.
 * // .. Provide MyInfo systematically to all that use it. Otherwise you get `unknown` for the related type.
 * type MyInfo = { something: boolean; };
 * class MyMix extends mixins(mixinTest1<MyInfo>, mixinTest2, mixinTest3<MyInfo>) {
 *     test() {
 *         this.testMe({ something: true }); // Requires `MyInfo`.
 *         this.name = "Mixy"; // Requires `string`.
 *         this.num; // number;
 *     }
 * }
 *
 * // Test failure.
 * // .. mixinTest3 is red-underlined (not assignable to `never`) as it requires mixinTest1.
 * class MyFail extends mixins(mixinTest3) { }
 *
 *
 * // - About mixing manually - //
 *
 * // If you use the above mixins manually, you might run into two problems (that's why `mixins` function exists).
 * // 1. The result won't give you the combined type. Though you could use MergeMixins or AsClass type to re-type it.
 * // 2. You get problems with intermediate steps in the chain - unless you specifically want it.
 * // +  The core reason for these problems is that each pair is evaluated separately, not as a continuum.
 * //
 * class MyManualMix extends mixinTest3<MyInfo>(mixinTest2(mixinTest1<MyInfo>(Object))) {
 *     // In the above line `mixinTest2(...)` is red-underlined, because it doesn't fit `mixinTest3`'s argument about requiring `mixinTest1`.
 *     test() {
 *         this.testInfo({ something: false }); // testInfo red-underlined because not existing.
 *         this.someMember = 8; // someMember is red-underlined because because not existing.
 *         this.enabled; // enabled is red-underlined because because not existing.
 *     }
 * }
 *
 *
 * // - Passing generic parameters (simple) - //
 *
 * // So instead do to this.
 * // 1. Create a class extending addMixin using `as ClassType` to loosen the base class type.
 * // .. Remarkably, _after_ setting up the interface below, we do have access to the base class even inside the extending class.
 * class MyClass<Info extends Record<string, any> = {}> extends (mixins(mixinTest1) as ClassType) {
 *     myMethod(key: keyof Info & string): number { return this.num; } // `num` is a recognized class member.
 * }
 * // 2. Create a matching interface extending what we actually want to extend.
 * // .. Another remarkable thing is that there's no need to actually retype the class in the interface.
 * interface MyClass<Info extends Record<string, any> = {}> extends MixinsInstance<[typeof mixinTest1<Info>]> { }
 * // .. The line below would work equally well for a single mixin case like this.
 * // interface MyClass<Info extends Record<string, any> = {}> extends InstanceType<ReturnType<typeof mixinTest1<Info>>> { }
 *
 * // Test the result, and prove the claim in step 2.
 * const myClass = new MyClass<MyInfo>();
 * myClass.testMe({ something: false }); // Requires `MyInfo`.
 * const value = myClass.myMethod("something"); // Requires `keyof MyInfo & string`. Returns `number`.
 * myClass.num === value; // The type is `boolean`, and outcome `true` on JS side.
 *
 * // Note. For patterns for more complex cases (with excessive deepness), see the README.md of `mixin-types`.
 *
 *
 * // - Passing generic parameters (complex) - //
 * //
 * // When the mixins become too deep in terms of typing, use the following approach.
 *
 * // Internal type.
 * type SignalsRecord = Record<string, (...args: any[]) => void>;
 *
 * // 1. Firstly, to (prepare to) avoid circularity either use private + public mixin or retype as ClassType.
 * // .. Either way, the core mixin does not (need to) use generic typing at all, and returns `ClassType`.
 * const _addSignalBoy = (Base: ClassType): ClassType => class SignalBoy extends Base {
 *     public signals: Record<string, Array<(...args: any[]) => void>> = {};
 *     public listenTo(signalName: string, ...signalArgs: any[]): void { } // Put code inside.
 *     public sendSignal(name: string, ...args: any[]): void { } // Put code inside.
 * }
 * // .. The public mixin takes in type args, and defines a typed return. Problems with deepness solved.
 * export const addSignalBoy = <Signals extends SignalsRecord = {}, BaseClass extends ClassType = ClassType>
 *     (Base: BaseClass): ClassType<SignalBoy<Signals>> & BaseClass => _addSignalBoy(Base) as any;
 *
 * // 2. Secondly, define the SignalBoy interface (needed above) explicitly, while the optional class loosely.
 * // .. The class can look like this.
 * export class SignalBoy<Signals extends SignalsRecord = {}> extends _addSignalBoy(Object) { }
 * // .. The interface must match the class (in name and type args), and holds the explicit typing.
 * export interface SignalBoy<Signals extends SignalsRecord = {}> { // Could extend many here, eg. `extends DataBoy, GameBoy`
 *     signals: Record<string, Array<(...args: any[]) => void>>;
 *     listenTo<Name extends string & keyof Signals>(name: Name, callback: Signals[Name], extraArgs?: any[] | null): void;
 *     sendSignal<Name extends string & keyof Signals>(name: Name, ...args: Parameters<Signals[Name]>): void;
 * }
 *
 * // Test.
 * type MySignals = { test: (num: number) => void; };
 * class MyBase { something: number = 0; }
 * class MyThing extends addSignalBoy<MySignals, typeof MyBase>(MyBase) {
 *     test() {
 *         this.something = 5; // Recognized as `number`.
 *         this.listenTo("test", (num) => console.log(num === this.something));
 *         this.sendSignal("test", 5); // Console logs `true`.
 *     }
 * }
 * // Alternatively to automate reading type of MyBase.
 * class MyThing2 extends (addSignalBoy as AsMixin<SignalBoy<MySignals>>)(MyBase) { }
 *
 *
 * ```
 */
declare function mixins<Mixins extends Array<(Base: ClassType) => ClassType>>(...mixins: ValidateMixins<Mixins>): MergeMixins<Mixins>;
/** Helper to create a mixed class with a base class and a sequence of mixins in ascending order: `[Base, mixinTest1, mixinTest2, ...]`.
 * - The typeguard evaluates each mixin up to 20 individually (by mixin form and implied requirements), the rest is not evaluated.
 * - Note that in cases where mixins are dependent on each other and support type arguments, provide them for all in the chain, including the base class.
 * - Note that you should likely define constructor arguments by adding a constructor statement on the extending class.
 *      * Alternatively could use `AsMixin`, `AsInstance` or `AsClass` to help with retyping the class with constructor args.
 *      * By default `mixinsWith` simply tries to read them from the last mixin, but that might not be correct (depending on the chain), nor as explicit as liked.
 *
 * ```
 *
 * // - Actual JS implementation - //
 *
 * // On the JS side, the feature is implemented like this.
 * // .. For example: `class MyClass extends mixinsWith(BaseClass, mixinTest1, mixinTest2) { }`.
 * export function mixinsWith(Base, ...mixins) {
 *     return mixins.reduce((ExtBase, mixin) => mixin(ExtBase), Base);
 * }
 *
 *
 * // - Basic usage - //
 *
 * // Create a base class and some mixins.
 * class MyBase<Info = {}> { testInfo(info: Info): void {} static STATIC_ONE = 1; }
 * const mixinTest1 = (Base: ClassType) => class Test1 extends Base { someMember: number = 5; }
 * const mixinTest2 = <Info = {}>(Base: typeof MyBase<Info>) => class Test2 extends Base { enabled: boolean = false; }
 * const mixinTest3 = <Info = {}>(Base: ReturnType<typeof mixinTest2<Info>>) => class Test3 extends Base { }
 *
 * // Create a mixed class.
 * // .. Provide MyInfo systematically to all that use it. Otherwise you get `unknown` for the related type.
 * type MyInfo = { something: boolean; };
 * class MyMix extends mixinsWith(MyBase<MyInfo>, mixinTest1, mixinTest2<MyInfo>, mixinTest3<MyInfo>) {
 *     test() {
 *         this.testInfo({ something: false }); // Requires `MyInfo`.
 *         this.someMember = 8; // Requires `number`.
 *         this.enabled; // boolean;
 *     }
 * }
 *
 * // Test failure.
 * // .. mixinTest2 is red-underlined as it requires MyBase, Object is not enough.
 * class MyFail extends mixinsWith(Object, mixinTest2) { }
 *
 *
 * // - About mixing manually - //
 *
 * // If you use the above mixins and base class manually, you get two problems (that's why `mixinsWith` function exists).
 * // 1. The result won't give you the combined type. Though you could use MergeMixins or AsClass type to re-type it.
 * // 2. You get problems with intermediate steps in the chain - unless you specifically want it.
 * // +  The core reason for these problems is that each pair is evaluated separately, not as a continuum.
 * //
 * class MyManualMix extends mixinTest3<MyInfo>(mixinTest2<MyInfo>(mixinTest1(MyBase<MyInfo>))) {
 *    // In the above line `mixinTest1(...)` is red-underlined, because it doesn't fit `mixinTest2`'s argument about requiring `Base`.
 *    test() {
 *        this.testInfo({ something: false }); // Requires `MyInfo`. // It's correct.
 *        this.someMember = 8; // someMember is red-underlined because because not existing.
 *        this.enabled; // boolean; // It's correct.
 *    }
 * }
 *
 *
 * // - Passing generic parameters (simple) - //
 *
 * // You might want to pass the Info arg further to a mixed base, but TS won't allow it.
 * // .. In the lines below, both <Info> are red-underlined, as base class expressions cannot ref. class type params.
 * class MyClass_Wish<Info extends Record<string, any> = {}> extends mixinsWith(MyBase<Info>, mixinTest1) { }
 * class MyClass_Wish_Manual<Info extends Record<string, any> = {}> extends mixinTest1(MyBase<Info>) { }
 *
 * // So instead do to this.
 * // 1. Create a class extending addMixin using `as ClassType` to loosen the base class type.
 * // .. Remarkably, _after_ setting up the interface below, we do have access to the base class even inside the extending class.
 * class MyClass<Info extends Record<string, any> = {}> extends (mixinsWith(MyBase, mixinTest1) as ClassType) {
 *     myMethod(key: keyof Info & string): number { return this.someMember; } // `someMember` is a recognized class member.
 * }
 *
 * // 2. Create a matching interface extending what we actually want to extend.
 * // .. Another remarkable thing is that there's no need to actually retype the class in the interface. Just declare it.
 * interface MyClass<Info extends Record<string, any> = {}> extends InstanceType<MergeMixinsWith<typeof MyBase<Info>, [typeof mixinTest1]>> { }
 *
 * // Test the result, and prove the claim in step 2.
 * const myClass = new MyClass<MyInfo>();
 * const value = myClass.myMethod("something"); // Requires `keyof MyInfo & string`. Returns `number`.
 * myClass.testInfo({ something: true });// Requires `MyInfo`.
 * myClass.someMember = 3; // Requires `number`.
 * myClass.constructor.STATIC_ONE; // number
 *
 *
 * // - Passing generic parameters (complex) - //
 *
 * // Internal type and MyBase class.
 * class MyBase { public name: string = ""; }
 *
 * // 1. Firstly, to avoid circularity either use private + public mixin or retype as ClassType.
 * // .. Let's use a single mixin + retyping in this example. Either way, the core mixin has no generic types.
 * export function addBaseBoy<
 *     BaseNames extends string = string,
 *     BaseClass extends typeof MyBase = typeof MyBase
 * >(Base: BaseClass): ClassType<BaseBoy<BaseNames>, any[]> & BaseClass {
 *     // Note that without (Base as typeof MyBase), there's a TS error about mixin constructor args.
 *     return class BaseBoy extends (Base as typeof MyBase) {
 *         // Use simple types - put the smart ones into the interface.
 *         public testBase(baseName: string): boolean {
 *             return this.name.startsWith(baseName);
 *         }
 *     } as any; // We are detached from the outcome on purpose.
 * }
 *
 * // 2. Secondly, define the BaseBoy interface (needed above) explicitly, while the optional class loosely.
 * // .. Since we chose to use "single mixin + retyping", let's retype now to avoid circularity: `as any as ClassType`.
 * // .. Note that we don't need to use `as any as typeof MyBase` since the interface already extends MyBase.
 * export class BaseBoy<BaseNames extends string = string> extends (addBaseBoy(MyBase) as any as ClassType) { }
 * // .. The interface must match the class (in name and type args), and holds the explicit typing.
 * // .. Note that if BaseBoy would also require a mixin would write: `extends MyBase, MyOtherMixin {`
 * export interface BaseBoy<BaseNames extends string = string> extends MyBase {
 *     testBase(baseName: BaseNames): boolean;
 * }
 *
 * // Test.
 * type MyNames = "base" | "ball";
 * class MyCustomBase extends MyBase {
 *    public age: number = 0;
 * }
 * class MyBaseBoy extends addBaseBoy<MyNames, typeof MyCustomBase>(MyCustomBase) {
 *     test() {
 *         this.age = 10; // Recognized as `number`.
 *         this.name = "base"; // Recognized as `string`. Not typed further, as MyBase not designed to accept args.
 *         this.testBase("ball"); // Returns `false`. Only input options are "base" and "ball".
 *         this.testBase("base"); // Returns `true`. Only input options are "base" and "ball".
 *     }
 * }
 * // Alternatively to automate reading type of MyBase.
 * class MyBaseBoy2 extends (addBaseBoy as AsMixin<BaseBoy<MyNames>>)(MyCustomBase) { }
 *
 *
 * ```
 */
declare function mixinsWith<Base extends ClassType, Mixins extends Array<(Base: ClassType) => ClassType>>(Base: Base, ...mixins: ValidateMixins<Mixins, Base>): MergeMixinsWith<Base, Mixins>;
/** Check if a tuple contains the given value type. */
type IncludesValue<Arr extends any[], Val extends any> = {
    [Key in keyof Arr]: Arr[Key] extends Val ? true : false;
}[number] extends false ? false : true;
/** Iterate down from 20 to 0. If iterates at 0 returns never. If higher than 20, returns 0. (With negative or other invalid returns all numeric options type.)
 * - When used, should not input negative, but go down from, say, `Arr["length"]`, and stop after 0.
 */
type IterateBackwards = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, ...0[]];
/** Iterate up from 0 to 20. If iterates at 20 or higher returns never. (With negative or other invalid returns all numeric options type.)
 * - When used, should not input negative, but go up from 0 until `Arr["length"]`.
 */
type IterateForwards = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, ...never[]];
/** Get the type for class from class instance - the opposite of `InstanceType`. Optionally define constructor args. */
type ClassType<T = {}, Args extends any[] = any[]> = new (...args: Args) => T;
/** Get the type for class constructor arguments. */
type GetConstructorArgs<T> = T extends new (...args: infer U) => any ? U : never;
/** Get the type for class constructor return. */
type GetConstructorReturn<T> = T extends new (...args: any[]) => infer U ? U : never;
/** Typing to re-create a clean class type using separated Class and Instance types, and ConstructorArgs. For example:
 *
 * ```
 *
 * // Declare type.
 * type MyClassType = AsClass<{ SOMETHING_STATIC: number; }, { instanced: boolean; }, [one: number, two?: boolean]>;
 *
 * // Fake a class and instance on JS side.
 * const MyClass = class MyClass { } as unknown as MyClassType;
 * const myClass = new MyClass(5); // Constructor requires: [one: number, two?: boolean]
 *
 * // Do some funky tests.
 * MyClass.SOMETHING_STATIC; // number
 * myClass.instanced; // boolean
 * myClass.constructor.SOMETHING_STATIC; // number
 * const mySubClass = new myClass.constructor(0, true);
 * mySubClass.instanced // boolean;
 * mySubClass.constructor.SOMETHING_STATIC; // number;
 *
 *
 * ```
 * Parameters and return:
 * @param Class Type of the merged class type. (Should extend ClassType, not required for fluency.)
 * @param Instance Type of the merged class instance. (Should extend Object, not required for fluency.)
 * @param ConstructorArgs Constructor arguments of the new class. Defaults to any[].
 * @returns The returned type is a new class type, with recursive class <-> instance support.
 */
type AsClass<Class, Instance, ConstructorArgs extends any[] = any[]> = Omit<Class, "new"> & {
    new (...args: ConstructorArgs): Instance & {
        ["constructor"]: AsClass<Class, Instance, ConstructorArgs>;
    };
};
/** This type helps to redefine a class instance.
 * - The core usage is for cases merging what an interface extends.
 * - Typically, the interface matches a class (that extends `as any as ClassType`).
 *
 * ```
 *
 * // As an alternative to this:
 * interface MyThing<Info = {}> extends Test1, Test2<Info>, MyBase {}
 * // You can do this:
 * interface MyThing<Info = {}> extends AsInstance<Test1 & Test2<Info> & MyBase> {}
 *
 * // However, consider including the static side, too:
 * interface MyThing<Info = {}> extends AsInstance<
 *     Test1 & Test2<Info> & MyBase,
 *     Test1Type & Test2Type<Info> & MyBaseType
 * > {}
 *
 * // Typescript reads the arguments from the class side, so should combine with class declaration.
 * class MyThing<Info = {}> extends mixinsWith(MyBase, mixinTest1, mixinTest2<Info>) {
 *     myNumber: number;
 *     constructor(myNumber: boolean) {
 *          super(); // In our simple example, we don't have any args.
 *          this.myNumber = myNumber;
 *     }
 * }
 *
 *
 * ```
 * Extra notes:
 * - Note that in many cases with actual mixins, you can use `MixinsInstance` instead (inferring the types from the mixin functions).
 *      * Though, the functionality of `AsInstance` has nothing to do with mixins. Internally uses `AsClass`.
 * - The only reasons why you might need / want to use `AsInstance` are:
 *      1. To cut redefine the "constructor" to get rid of error about conflicting extends (for the interface).
 *          * Though if the interfaces to extend do not define "constructor", no problem in the first place.
 *      2. To help cut excessive deepness in certain use cases with matching class.
 *          * Especially related to using `this as MyThing` inside the class (to cut external generics away from `MyThing<Info>`).
 *          * However the deepness only appears with certain other prerequisites (such as using "constructor" in the interfaces to extend).
 *      3. As an instance based alternative to `AsClass`.
 *          * That is, if you want to specifically define the static side (2nd arg) of the class, or constructor args (3rd arg).
 *          * However, typescript reads constructor args from the `class` instead, so only helps when using the .constructor from the instance.
 *
 */
type AsInstance<Instance extends Object, Class = Instance["constructor"], ConstructorArgs extends any[] = any[]> = Instance & {
    ["constructor"]: AsClass<Class, Instance, ConstructorArgs>;
};
/** Type helper for classes extending mixins with generic parameters.
 * @param MixinInstance Should refer to the instance type of the mixin. To feed in class type use `AsMixinType`.
 * @param ConstructorArgs Optionally define the constructor args explicitly.
 *      * By default tries to read from mixins in case they use "constructor".
 *          - On the other hand it's not recommended for mixins to use "constructor" for other reasons.
 *      * Note also that the mixin chain should always define the constructor args for the resulting class explicitly.
 * @returns The returned type is a mixin creator, essentially: `(Base: TBase) => TBase & ClassType<MixinInstance>`.
 *
 * ```
 *
 * // Let's first examine a simple mixin with generic params.
 * // .. It works fine, until things become more complex: you get problems with excessive deepness of types.
 * const mixinTest_Simple = <Info = {}>(Base: ClassType) => class Test extends Base {
 *     feedInfo(info: Info): void {}
 * }
 *
 * // To provide a mixin base without problems of deepness we can do the following.
 * // .. Let's explicitly type what mixinTest returns to help typescript.
 * interface Test<Info = {}> { feedInfo(info: Info): void; }
 * const mixinTest = <Info = {}, BaseClass extends ClassType = ClassType>(Base: BaseClass): ClassType<Test<Info>> => class Test extends Base {
 *     feedInfo(info: Info): void {}
 * }
 *
 * // Custom base.
 * class MyBase { someMember: number = 0; }
 *
 * // The annoyance with above is that we lose automated typing of the BaseClass.
 * // .. AsMixin simply provides a way to automate the typing of the base class.
 * // .. Note that you can also optionally define the constructor arguments using the 2nd type arg.
 * type MyInfo = { something: boolean; };
 * class MyMix_1 extends mixinTest<MyInfo, typeof MyBase>(MyBase) { } // Needs to specify the base type explicitly here.
 * class MyMix_2 extends (mixinTest as AsMixin<Test<MyInfo>>)(MyBase) { } // Get MyBase type dynamically.
 *
 * // The feature becomes more useful when typing a longer sequence.
 * // .. Define another mixin with explicit interface.
 * interface Test2<Data extends Record<string, any> = {}> { data: Data; }
 * const mixinTest2 = <Data extends Record<string, any> = {}>(Base: ClassType) => class extends Base {
 *     data: Data;
 *     constructor(...args: any[]) {
 *         super(...args.slice(1));
 *         this.data = args[0];
 *     }
 * }
 * // .. Define class.
 * type MyData = { name: string; }
 * class MyMultiMix extends
 *     (mixinTest2 as AsMixin<Test2<MyData>, [data: MyData]>)( // Define constr. args here.
 *         (mixinTest as AsMixin<Test<MyInfo>>)(MyBase)) {}
 *
 * // .. Test.
 * const myMultiMix = new MyMultiMix({ name: "me" }); // Requires `MyData`.
 * myMultiMix.someMember = 5; // Requires `number`.
 * myMultiMix.feedInfo({ something: false }); // Requires `MyInfo`.
 *
 * ```
 *
 */
type AsMixin<MixinInstance extends Object, ConstructorArgs extends any[] = MixinInstance["constructor"] extends new (...args: any[]) => any ? GetConstructorArgs<MixinInstance["constructor"]> : any[]> = <TBase extends ClassType>(Base: TBase) => Omit<TBase, "new"> & {
    new (...args: ConstructorArgs): GetConstructorReturn<TBase> & MixinInstance;
};
/** Evaluate a chain of mixins.
 * - Returns back an array with the respective mixins or supplements with `never` for each failed item.
 * - The failure is by it required from previous mixins or by not being a function in the mixin form: `(Base: ClassType) => ClassType`.
 * - Note that the evaluation does not take into account how constructor arguments are passed - but validates instead inheritance of class features.
 *
 * ```
 *
 * // Create mixins.
 * const mixinTest1 = <Info = {}>(Base: ClassType) => class Test1 extends Base { testMe(testInfo: Info): void {} }
 * const mixinTest2 = <Info = {}>(Base: ReturnType<typeof mixinTest1<Info>>) => class Test2 extends Base { }
 *
 * // Create shortcuts for our tests below.
 * type MyInfo = { test: boolean; };
 * type Test1 = typeof mixinTest1<MyInfo>;
 * type Test2 = typeof mixinTest2<MyInfo>;
 *
 * // Do some tests.
 * type EvalMixins1 = ValidateMixins<[Test1]>; // [typeof mixinTest1<MyInfo>]
 * type EvalMixins2 = ValidateMixins<[Test2]>; // [never]
 * type EvalMixins3 = ValidateMixins<[Test1, Test2]>; // [typeof mixinTest1<MyInfo>, typeof mixinTest2<MyInfo>]
 * type EvalMixins4 = ValidateMixins<[Test2, Test1]>; // [never, typeof mixinTest1<MyInfo>]
 * type IsChain3Invalid = IncludesValue<EvalMixins3, never>; // false
 * type IsChain4Invalid = IncludesValue<EvalMixins4, never>; // true
 *
 * // Funkier tests.
 * type EvalMixins5 = ValidateMixins<[Test1, Test2, "string"]>; // [..., never]
 * type EvalMixins6 = ValidateMixins<[Test1, Test2, () => {}]>; // [..., never]
 * type EvalMixins7 = ValidateMixins<[Test1, Test2, (Base: ClassType) => ClassType ]>; // All ok.
 *
 *
 * ```
 */
type ValidateMixins<Mixins extends Array<any>, BaseClass extends ClassType = ClassType, Processed extends Array<((Base: ClassType) => ClassType) | never> = [], Index extends number | never = 0> = Index extends Mixins["length"] ? Processed : Index extends never ? IncludesValue<Processed, never> extends true ? [...Processed, ...any] : Mixins : Mixins[Index] extends undefined ? IncludesValue<Processed, never> extends true ? [...Processed, ...any] : Mixins : Mixins[Index] extends (Base: ClassType) => ClassType ? ValidateMixins<Mixins, BaseClass & ReturnType<Mixins[Index]>, BaseClass extends Parameters<Mixins[Index]>[0] ? [...Processed, Mixins[Index]] : [...Processed, never], IterateForwards[Index]> : ValidateMixins<Mixins, BaseClass, [...Processed, never], IterateForwards[Index]>;
/** Intersect mixins to a new clean class.
 * - Note that if the mixins contain dependencies of other mixins, should type the dependencies fully to avoid unknown. See below.
 * - Put in optional 2nd argument to type ConstructorArgs for the final outcome explicitly. Defaults to the args of the last in chain.
 * ```
 *
 * // Create mixins.
 * const mixinTest1 = <Info = {}>(Base: ClassType) => class Test1 extends Base { testMe(testInfo: Info): void {} }
 * const mixinTest2 = <Info = {}>(Base: ReturnType<typeof mixinTest1<Info>>) => class Test2 extends Base { static STATIC_ONE = 1; }
 * const mixinTest3 = (Base: ClassType) => class Test3 extends Base { name: string = ""; }
 *
 * // Merge the types manually.
 * type MyInfo = { test: boolean; };
 * type Mixins = [typeof mixinTest1<MyInfo>, typeof mixinTest2<MyInfo>, typeof mixinTest3]; // Pass the MyInfo to all that need it.
 * type MergedClassType = MergeMixins<Mixins>;
 *
 * // Extra. MergeMixins does not evaluate the chain. Do it with ValidateMixins.
 * type IsChainInvalid = IncludesValue<ValidateMixins<Mixins>, never>; // false
 * type IsChainInvalidNow = IncludesValue<ValidateMixins<[Mixins[1], Mixins[0], Mixins[2]]>, never>; // true
 *
 * // Fake a class.
 * const MergedClass = class MergedClass { } as unknown as MergedClassType;
 * const mergedClass = new MergedClass();
 *
 * // Do funky tests.
 * mergedClass.testMe({ test: false });
 * mergedClass.testMe({ test: 5 }); // Fails - "test" is red-underlined. It's `unknown` if MyInfo only passed to mixinTest1 or mixinTest2, not both.
 * mergedClass.constructor.STATIC_ONE; // number
 * mergedClass.name = "Mergy";
 *
 * ```
 */
type MergeMixins<Mixins extends Array<(Base: ClassType) => ClassType>, ConstructorArgs extends any[] = Mixins["length"] extends 0 ? any[] : GetConstructorArgs<ReturnType<Mixins[IterateBackwards[Mixins["length"]]]>>, Class extends Object = {}, Instance extends Object = {}, Index extends number | never = Mixins["length"] extends 0 ? never : number extends Mixins["length"] ? never : IterateBackwards[Mixins["length"]]> = Index extends never ? AsClass<Class, Instance, ConstructorArgs> : Index extends 0 ? AsClass<Class & ReturnType<Mixins[Index]>, Instance & InstanceType<ReturnType<Mixins[Index]>>, ConstructorArgs> : MergeMixins<Mixins, ConstructorArgs, Class & ReturnType<Mixins[Index]>, Instance & InstanceType<ReturnType<Mixins[Index]>>, IterateBackwards[Index]>;
/** This is exactly like MergeMixins (see its notes) but returns the instance type. Useful for creating a class interface.
 * - For example: `MixinsInstance<MixinsArray, ConstructorArgs?>`.
 */
type MixinsInstance<Mixins extends Array<(Base: ClassType) => ClassType>, ConstructorArgs extends any[] = Mixins["length"] extends 0 ? any[] : GetConstructorArgs<ReturnType<Mixins[IterateBackwards[Mixins["length"]]]>>> = InstanceType<MergeMixins<Mixins, ConstructorArgs>>;
/** This is exactly like MergeMixins (see its notes) but allows to input the class type of the base class for the mixin chain.
 * - To get the type of the class use `typeof MyBaseClass`, where MyBaseClass is a JS class: `class MyBaseClass {}`.
 * - For example: `MergeMixinsWith<typeof MyBaseClass, MixinsArray, ConstructorArgs?>`.
 */
type MergeMixinsWith<BaseClass extends ClassType, Mixins extends Array<(Base: ClassType) => ClassType>, ConstructorArgs extends any[] = Mixins["length"] extends 0 ? any[] : GetConstructorArgs<ReturnType<Mixins[IterateBackwards[Mixins["length"]]]>>> = MergeMixins<Mixins, ConstructorArgs, BaseClass, InstanceType<BaseClass>>;
/** This is exactly like MergeMixinsWith (see its notes) but returns the instance type. Useful for creating a class interface.
 * - For example: `MixinsInstanceWith<typeof MyBaseClass, MixinsArray, ConstructorArgs?>`.
 */
type MixinsInstanceWith<BaseClass extends ClassType, Mixins extends Array<(Base: ClassType) => ClassType>, ConstructorArgs extends any[] = Mixins["length"] extends 0 ? any[] : GetConstructorArgs<ReturnType<Mixins[IterateBackwards[Mixins["length"]]]>>> = InstanceType<MergeMixins<Mixins, ConstructorArgs, BaseClass, InstanceType<BaseClass>>>;
/** The type for the `mixins` function, including evaluating the sequence and returning combined class type. */
type MixinsFunc = <Mixins extends Array<(Base: ClassType) => ClassType>>(...mixins: ValidateMixins<Mixins>) => MergeMixins<Mixins>;
/** The type for the `mixinsWith` function, including evaluating the sequence and returning combined class type. */
type MixinsWithFunc = <Base extends ClassType, Mixins extends Array<(Base: ClassType) => ClassType>>(Base: Base, ...mixins: ValidateMixins<Mixins, Base>) => MergeMixinsWith<Base, Mixins>;

export { AsClass, AsInstance, AsMixin, ClassType, GetConstructorArgs, GetConstructorReturn, IncludesValue, IterateBackwards, IterateForwards, MergeMixins, MergeMixinsWith, MixinsFunc, MixinsInstance, MixinsInstanceWith, MixinsWithFunc, ValidateMixins, mixins, mixinsWith };
