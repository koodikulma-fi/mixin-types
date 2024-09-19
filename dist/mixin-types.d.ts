/** Helper to create a mixed class from a sequence of mixins in ascending order: `[addMixin1, addMixin2, ...]`.
 * - The typeguard evaluates each mixin up to 20 individually (by mixin form and implied requirements), the rest is not evaluated.
 * - Note that in cases where mixins are dependent on each other and support type arguments, provide them for all in the chain.
 * ```
 *
 * // - Actual JS implementation - //
 *
 * // On the JS side, the feature is implemented like this.
 * // .. For example: `class MyClass extends Mixins(addMixin1, addMixin2) { }`.
 * export function Mixins(...mixins) {
 *     return mixins.reduce((ExtBase, mixin) => mixin(ExtBase), Object);
 * }
 *
 *
 * // - Basic usage - //
 *
 * // Create mixins.
 * const addMixin1 = <Info = {}>(Base: ClassType) => class Mixin1 extends Base { num: number = 5; testMe(testInfo: Info): void {} }
 * const addMixin2 = (Base: ClassType) => class Mixin2 extends Base { name: string; }
 * const addMixin3 = <Info = {}>(Base: ReturnType<typeof addMixin1<Info>>) => class Mixin3 extends Base { }
 *
 * // Create a mixed class.
 * // .. Provide MyInfo systematically to all that use it. Otherwise you get `unknown` for the related type.
 * type MyInfo = { something: boolean; };
 * class MyMix extends Mixins(addMixin1<MyInfo>, addMixin2, addMixin3<MyInfo>) {
 *     test() {
 *         this.testMe({ something: true }); // Requires `MyInfo`.
 *         this.name = "Mixy"; // Requires `string`.
 *         this.num; // number;
 *     }
 * }
 *
 * // Test failure.
 * // .. addMixin3 is red-underlined (not assignable to `never`) as it requires addMixin1.
 * class MyFail extends Mixins(addMixin3) { }
 *
 *
 * // - About mixing manually - //
 *
 * // If you use the above mixins manually, you might run into two problems (that's why `Mixins` function exists).
 * // 1. The result won't give you the combined type. Though you could use MergeMixins or AsClass type to re-type it.
 * // 2. You get problems with intermediate steps in the chain - unless you specifically want it.
 * // +  The core reason for these problems is that each pair is evaluated separately, not as a continuum.
 * //
 * class MyManualMix extends addMixin3<MyInfo>(addMixin2(addMixin1<MyInfo>(Object))) {
 *     // In the above line `addMixin2(...)` is red-underlined, because it doesn't fit `addMixin3`'s argument about requiring `addMixin1`.
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
 * class MyClass<Info extends Record<string, any> = {}> extends (Mixins(addMixin1) as ClassType) {
 *     myMethod(key: keyof Info & string): number { return this.num; } // `num` is a recognized class member.
 * }
 * // 2. Create a matching interface extending what we actually want to extend.
 * // .. Another remarkable thing is that there's no need to actually retype the class in the interface.
 * interface MyClass<Info extends Record<string, any> = {}> extends MixinsInstance<[typeof addMixin1<Info>]> { }
 * // .. The line below would work equally well for a single mixin case like this.
 * // interface MyClass<Info extends Record<string, any> = {}> extends InstanceType<ReturnType<typeof addMixin1<Info>>> { }
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
 * // 1. Firstly, to (prepare to) avoid circularity use private + public mixin.
 * // .. The private mixin is the core mixin, but it has no generic typing at all, and returns ClassType.
 * const _addSignalBoy = (Base: ClassType): ClassType => class SignalBoy extends Base {
 *     public signals: Record<string, Array<(...args: any[]) => void>> = {};
 *     public listenTo(signalName: string, ...signalArgs: any[]): void { } // Put code inside.
 *     public sendSignal(name: string, ...args: any[]): void { } // Put code inside.
 * }
 * // .. The public mixin takes in type args, and defines a typed return.
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
declare function Mixins<Mixins extends Array<(Base: ClassType) => ClassType>>(...mixins: EvaluateMixinChain<Mixins>): MergeMixins<Mixins>;
/** Helper to create a mixed class with a base class and a sequence of mixins in ascending order: `[Base, addMixin1, addMixin2, ...]`.
 * - The typeguard evaluates each mixin up to 20 individually (by mixin form and implied requirements), the rest is not evaluated.
 * - Note that in cases where mixins are dependent on each other and support type arguments, provide them for all in the chain, including the base class.
 * ```
 *
 * // - Actual JS implementation - //
 *
 * // On the JS side, the feature is implemented like this.
 * // .. For example: `class MyClass extends MixinsWith(BaseClass, addMixin1, addMixin2) { }`.
 * export function MixinsWith(Base, ...mixins) {
 *     return mixins.reduce((ExtBase, mixin) => mixin(ExtBase), Base);
 * }
 *
 *
 * // - Basic usage - //
 *
 * // Create a base class and some mixins.
 * class MyBase<Info = {}> { testInfo(info: Info): void {} static STATIC_ONE = 1; }
 * const addMixin1 = (Base: ClassType) => class Mixin1 extends Base { someMember: number = 5; }
 * const addMixin2 = <Info = {}>(Base: typeof MyBase<Info>) => class Mixin2 extends Base { enabled: boolean = false; }
 * const addMixin3 = <Info = {}>(Base: ReturnType<typeof addMixin2<Info>>) => class Mixin3 extends Base { }
 *
 * // Create a mixed class.
 * // .. Provide MyInfo systematically to all that use it. Otherwise you get `unknown` for the related type.
 * type MyInfo = { something: boolean; };
 * class MyMix extends MixinsWith(MyBase<MyInfo>, addMixin1, addMixin2<MyInfo>, addMixin3<MyInfo>) {
 *     test() {
 *         this.testInfo({ something: false }); // Requires `MyInfo`.
 *         this.someMember = 8; // Requires `number`.
 *         this.enabled; // boolean;
 *     }
 * }
 *
 * // Test failure.
 * // .. addMixin2 is red-underlined as it requires MyBase, Object is not enough.
 * class MyFail extends MixinsWith(Object, addMixin2) { }
 *
 *
 * // - About mixing manually - //
 *
 * // If you use the above mixins and base class manually, you get two problems (that's why `MixinsWith` function exists).
 * // 1. The result won't give you the combined type. Though you could use MergeMixins or AsClass type to re-type it.
 * // 2. You get problems with intermediate steps in the chain - unless you specifically want it.
 * // +  The core reason for these problems is that each pair is evaluated separately, not as a continuum.
 * //
 * class MyManualMix extends addMixin3<MyInfo>(addMixin2<MyInfo>(addMixin1(MyBase<MyInfo>))) {
 *    // In the above line `addMixin1(...)` is red-underlined, because it doesn't fit `addMixin2`'s argument about requiring `Base`.
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
 * class MyClass_Wish<Info extends Record<string, any> = {}> extends MixinsWith(MyBase<Info>, addMixin1) { }
 * class MyClass_Wish_Manual<Info extends Record<string, any> = {}> extends addMixin1(MyBase<Info>) { }
 *
 * // So instead do to this.
 * // 1. Create a class extending addMixin using `as ClassType` to loosen the base class type.
 * // .. Remarkably, _after_ setting up the interface below, we do have access to the base class even inside the extending class.
 * class MyClass<Info extends Record<string, any> = {}> extends (MixinsWith(MyBase, addMixin1) as ClassType) {
 *     myMethod(key: keyof Info & string): number { return this.someMember; } // `someMember` is a recognized class member.
 * }
 *
 * // 2. Create a matching interface extending what we actually want to extend.
 * // .. Another remarkable thing is that there's no need to actually retype the class in the interface. Just declare it.
 * interface MyClass<Info extends Record<string, any> = {}> extends InstanceType<MergeMixinsWith<typeof MyBase<Info>, [typeof addMixin1]>> { }
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
 * // 1. Firstly, to (prepare to) avoid circularity use private + public mixin.
 * // .. The private mixin is the core mixin, but it has no generic typing at all, and returns ClassType.
 * const _addBaseBoy = (Base: typeof MyBase): ClassType => class BaseBoy extends Base {
 *     public testBase(baseName: string): boolean { return this.name.startsWith(baseName); }
 * }
 * // .. The public mixin takes in type args, and defines a typed return.
 * export const addBaseBoy = <BaseNames extends string = string, BaseClass extends typeof MyBase = typeof MyBase>
 *     (Base: BaseClass): ClassType<BaseBoy<BaseNames>> & BaseClass => _addBaseBoy(Base) as any;
 *
 * // 2. Secondly, define the BaseBoy interface (needed above) explicitly, while the optional class loosely.
 * // .. The class can look like this.
 * export class BaseBoy<BaseNames extends string = string> extends _addBaseBoy(MyBase) { }
 * // .. The interface must match the class (in name and type args), and holds the explicit typing.
 * export interface BaseBoy<BaseNames extends string = string> extends MyBase {
 *     testBase(baseName: BaseNames): boolean;
 * }
 *
 * // Test.
 * type MyNames = "base" | "ball";
 * class MyCustomBase extends MyBase {
 *     public age: number = 0;
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
declare function MixinsWith<Base extends ClassType, Mixins extends Array<(Base: ClassType) => ClassType>>(Base: Base, ...mixins: EvaluateMixinChain<Mixins, Base>): MergeMixinsWith<Base, Mixins>;
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
 * @param Class Should refer to the type of the merged class type. For fluency it's not required that it's a ClassType (the "new" part will be omitted anyhow).
 * @param Instance Should refer to the type of the merged class instance.
 * @param ConstructorArgs Should refer to the constructor arguments of the new class (= the last mixin in the chain). Defaults to [].
 * @returns The returned type is a new class type, with recursive class <-> instance support.
 */
type AsClass<Class, Instance, ConstructorArgs extends any[] = []> = Omit<Class, "new"> & {
    new (...args: ConstructorArgs): Instance & {
        ["constructor"]: AsClass<Class, Instance, ConstructorArgs>;
    };
};
/** Type helper for classes extending mixins with generic parameters.
 * @param MixinInstance Should refer to the instance type of the mixin. To feed in class type use `AsMixinType`.
 * @returns The returned type is a mixin creator, essentially: `(Base: TBase) => TBase & ClassType<MixinInstance>`.
 *
 * ```
 * // Let's first examine a simple mixin with generic params.
 * // .. It works fine, until things become more complex: you get problems with excessive deepness of types.
 * const addMyMixin_Simple = <Info = {}>(Base: Base) => class MyMixin extends Base {
 *      feedInfo(info: Info): void {}
 * }
 *
 * // To provide a mixin base without problems of deepness we can do the following.
 * // .. Let's explicitly type what addMyMixin returns to help typescript.
 * interface MyMixin<Info = {}> { feedInfo(info: Info): void; }
 * const addMyMixin = <Info = {}, BaseClass extends ClassType = ClassType>(Base: BaseClass): ClassType<MyMixin<Info>> => class MyMixin extends Base {
 *      feedInfo(info: Info): void {}
 * }
 *
 * // The annoyance with above is that we lose automated typing of the BaseClass.
 * // .. AsMixin simply provides a way to automate the typing of the base class.
 * type MyInfo = { something: boolean; };
 * class MyMix_1 extends addMyMixin<MyInfo, typeof MyBase>(MyBase) { } // Needs to specify the base type explicitly here.
 * class MyMix_2 extends (addMyMixin as AsMixin<MyMixin<MyInfo>>)(MyBase) { } // Get MyBase type dynamically.
 *
 * ```
 *
 */
type AsMixin<MixinInstance extends Object> = <TBase extends ClassType>(Base: TBase) => Omit<TBase, "new"> & {
    new (...args: GetConstructorArgs<MixinInstance["constructor"]>): GetConstructorReturn<TBase> & MixinInstance;
};
/** Evaluate a chain of mixins.
 * - Returns back an array with the respective mixins or supplements with `never` for each failed item.
 * - The failure is by it required from previous mixins or by not being a function in the mixin form: `(Base: ClassType) => ClassType`.
 * - Note that the evaluation does not take into account how constructor arguments are passed - but validates instead inheritance of class features.
 *
 * ```
 *
 * // Create mixins.
 * const addMixin1 = <Info = {}>(Base: ClassType) => class Mixin1 extends Base { testMe(testInfo: Info): void {} }
 * const addMixin2 = <Info = {}>(Base: ReturnType<typeof addMixin1<Info>>) => class Mixin2 extends Base { }
 *
 * // Create shortcuts for our tests below.
 * type MyInfo = { test: boolean; };
 * type Mixin1 = typeof addMixin1<MyInfo>;
 * type Mixin2 = typeof addMixin2<MyInfo>;
 *
 * // Do some tests.
 * type EvalMixins1 = EvaluateMixinChain<[Mixin1]>; // [typeof addMixin1<MyInfo>]
 * type EvalMixins2 = EvaluateMixinChain<[Mixin2]>; // [never]
 * type EvalMixins3 = EvaluateMixinChain<[Mixin1, Mixin2]>; // [typeof addMixin1<MyInfo>, typeof addMixin2<MyInfo>]
 * type EvalMixins4 = EvaluateMixinChain<[Mixin2, Mixin1]>; // [never, typeof addMixin1<MyInfo>]
 * type IsChain3Invalid = IncludesValue<EvalMixins3, never>; // false
 * type IsChain4Invalid = IncludesValue<EvalMixins4, never>; // true
 *
 * // Funkier tests.
 * type EvalMixins5 = EvaluateMixinChain<[Mixin1, Mixin2, "string"]>; // [..., never]
 * type EvalMixins6 = EvaluateMixinChain<[Mixin1, Mixin2, () => {}]>; // [..., never]
 * type EvalMixins7 = EvaluateMixinChain<[Mixin1, Mixin2, (Base: ClassType) => ClassType ]>; // All ok.
 *
 *
 * ```
 */
type EvaluateMixinChain<Mixins extends Array<any>, BaseClass extends ClassType = ClassType, Processed extends Array<((Base: ClassType) => ClassType) | never> = [], Index extends number | never = 0> = Index extends Mixins["length"] ? Processed : Index extends never ? IncludesValue<Processed, never> extends true ? [...Processed, ...any] : Mixins : Mixins[Index] extends undefined ? IncludesValue<Processed, never> extends true ? [...Processed, ...any] : Mixins : Mixins[Index] extends (Base: ClassType) => ClassType ? EvaluateMixinChain<Mixins, BaseClass & ReturnType<Mixins[Index]>, BaseClass extends Parameters<Mixins[Index]>[0] ? [...Processed, Mixins[Index]] : [...Processed, never], IterateForwards[Index]> : EvaluateMixinChain<Mixins, BaseClass, [...Processed, never], IterateForwards[Index]>;
/** Intersect mixins to a new clean class.
 * - Note that if the mixins contain dependencies of other mixins, should type the dependencies fully to avoid unknown. See below.
 * - Put in optional 2nd argument to type ConstructorArgs for the final outcome explicitly. Defaults to the args of the last in chain.
 * ```
 *
 * // Create mixins.
 * const addMixin1 = <Info = {}>(Base: ClassType) => class Mixin1 extends Base { testMe(testInfo: Info): void {} }
 * const addMixin2 = <Info = {}>(Base: ReturnType<typeof addMixin1<Info>>) => class Mixin2 extends Base { static STATIC_ONE = 1; }
 * const addMixin3 = (Base: ClassType) => class Mixin3 extends Base { name: string = ""; }
 *
 * // Merge the types manually.
 * type MyInfo = { test: boolean; };
 * type Mixins = [typeof addMixin1<MyInfo>, typeof addMixin2<MyInfo>, typeof addMixin3]; // Pass the MyInfo to all that need it.
 * type MergedClassType = MergeMixins<Mixins>;
 *
 * // Extra. MergeMixins does not evaluate the chain. Do it with EvaluateMixinChain.
 * type IsChainInvalid = IncludesValue<EvaluateMixinChain<Mixins>, never>; // false
 * type IsChainInvalidNow = IncludesValue<EvaluateMixinChain<[Mixins[1], Mixins[0], Mixins[2]]>, never>; // true
 *
 * // Fake a class.
 * const MergedClass = class MergedClass { } as unknown as MergedClassType;
 * const mergedClass = new MergedClass();
 *
 * // Do funky tests.
 * mergedClass.testMe({ test: false });
 * mergedClass.testMe({ test: 5 }); // Fails - "test" is red-underlined. It's `unknown` if MyInfo only passed to addMixin1 or addMixin2, not both.
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

export { AsClass, AsMixin, ClassType, EvaluateMixinChain, GetConstructorArgs, GetConstructorReturn, IncludesValue, IterateBackwards, IterateForwards, MergeMixins, MergeMixinsWith, Mixins, MixinsInstance, MixinsInstanceWith, MixinsWith };