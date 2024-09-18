
## TODO (docs):
- Add tiny to docs:
    * numberRange, buildRecordable
- Add RefreshCycles and ContextCycles.
- Add about the static methods in ContextAPI.
- Maybe rename the repo to "refresh-cycle" .. ?  
    - --> MAYBE RENAME .. To ... "data-mix" ..! .. we also provide mixin tools..
- HEy.. WE 'D BASICALLY LIKE... SIGNALBOY..
    * For example.... RefreshCycle wants to just have that.. It's confusing for it to have the more complex features... and awaitSync and such.
    * So.. Add that, and remove the combos: SignalDataMan and SignalDataBoy. Can just do it through the mixin.


## WHAT

`data-signals` is a light weight library containing a few simple but carefully designed JS/TS classes, mixins and tools for managing complex state and action flow in sync.

The classes and methods are fully typed and commented. Accordingly the methods themselves can be used as documentation.

The library runs on server and browser, and has no dependencies.

The npm package can be found with: [data-signals](https://www.npmjs.com/package/data-signals). Contribute in GitHub: [koodikulma-fi/data-signals.git](https://github.com/koodikulma-fi/data-signals.git)

---

## CONTENTS

There are 3 kinds of tools available.

### 1. BASE CLASSES / MIXINS

A couple of classes and mixins for signalling and data listening features.
- `SignalMan` provides a service to attach listener callbacks to signals and then emit signals from the class - optionally supporting various data or sync related options.
- `DataBoy` provides data listening services, but without actually having any data.
- `DataMan` extends `DataBoy` to provide the actual data hosting and related methods.
- `SignalDataBoy` extends both `SignalMan` and `DataBoy` (through mixins).
- `SignalDataMan` extends both `SignalMan` and `DataMan` (through mixins).

Note. The mixins simply allow to extend an existing class with the mixin features - the result is a new class.

### 2. CONTEXT CLASSES

Two classes specialized for complex data sharing situations, like those in modern web apps.
- `Context` extends `SignalDataMan` with syncing related settings. 
- `ContextAPI` extends `SignalDataBoy` and allows to listen to data and signals in named contexts.

The `ContextAPI` can also affect syncing of `Context` refreshes in regards to the "delay" cycle.
- For example, consider a state based rendering app, where you first set some data in context to trigger rendering ("pre-delay"), but want to send a signal only once the whole rendering is completed ("delay"). Eg. the signal is meant for a component that was not there before the state refresh.
- To solve it, the rendering hosts can simply use a connected contextAPI and override its `awaitDelay` method to await until rendering completed, making the "delay" be triggered only once the last of them completed.

### 3. STATIC LIBRARY METHODS

A couple of data reusing concepts in the form of library methods.
- Simple `areEqual(a, b, level?)` and `deepCopy(anything, level?)` methods with custom level of depth (-1).
    * The methods support native JS Objects, Arrays, Maps, Sets and handling classes.
- Data selector features:
    * `createDataTrigger` triggers a callback when reference data is changed from previous time.
    * `createDataMemo` recomputes / reuses data based on arguments: if changed, calls the producer callback.
    * `createDataSource` is like createDataMemo but with an extraction process before the producer callback.
    * `createCachedSource` is like createDataSource but creates a new data source for each cacheKey.

---

## 1. BASE CLASSES / MIXINS

### SignalMan

- `SignalMan` provides signalling features, from simple instant void signals to complex synced awaiting getters.

```typescript

// Prepare signal typing.
type Signals = { doIt: (what: number) => void; whatIsLife: (whoAsks: string) => Promise<number>; };

// Create a SignalMan instance.
const signalMan = new SignalMan<Signals>();

// Listen to signals.
signalMan.listenTo("doIt", (what) => { console.log(what); });
signalMan.listenTo("whatIsLife", (whoAsks) => new Promise(res => res(whoAsks === "me" ? 0 : -1)));

// Send a signal.
signalMan.sendSignal("doIt", 5);

// Send a more complex signal.
const livesAre = await signalMan.sendSignalAs("await", "whatIsLife", "me"); // number[]
const lifeIsAfterAll = await signalMan.sendSignalAs(["await", "first"], "whatIsLife", "me"); // number | undefined

```

### DataMan & DataBoy

- `DataBoy` simply provides data listening basis without having any data. (It's useful eg. for `ContextAPI`s.)
- `DataMan` completes the concept with the `data` member and related methods for setting and getting data.
    * Note that when nested data is set (with setInData), all the parenting data dictionaries are shallow copied.

```typescript

// Create a DataMan instance.
const initialData = { something: { deep: true }, simple: "yes" };
const dataMan = new DataMan(initialData);

// Get data.
dataMan.getData(); // { something: { deep: true }, simple: "yes" }
dataMan.getInData("something.deep"); // true

// Listen to data.
dataMan.listenToData("something.deep", "simple", (deep, simple) => { console.log(deep, simple); });
dataMan.listenToData("something.deep", (deepOrFallback) => { }, [false]); // If "something.deep" would be undefined, use `false`.
dataMan.listenToData({ "something.deep": 0 as const, "simple": false }, (values) => {
    values["something.deep"]; // boolean | 0
    values["simple"]; // string | boolean
});

// Trigger changes.
// .. At DataMan level, the data is refreshed instantly and optional timeouts are resolved separately.
// .. Note. The Contexts level has 0ms timeout by default and the refreshes are triggered all in sync.
dataMan.setData({ simple: "no" });
dataMan.setInData("something.deep", false); // Automatically shallow copies the parenting "something" and root data object.
dataMan.refreshData("something.deep"); // Trigger a refresh manually.
dataMan.refreshData(["something.deep", "simple"], 5); // Trigger a refresh after 5ms timeout.

```

### How to use mixins

- Often you can just go and extend the class directly.
- But in situations where you can't, mixins make life so much more convenient.

```typescript

// Let's define some custom class.
class CustomBase {
    something: string = "";
    hasSomething(): boolean {
        return !!this.something;
    }
}

// Let's mix in typed SignalMan features.
type MySignals = { doSomething: (...things: number[]) => void; };
class CustomSignalMix extends (SignalManMixin as ClassMixer<SignalManType<MySignals>>)(CustomBase) { }
// class CustomSignalMix extends SignalManMixin(CustomBase) { } // Without typing.

// Create like any class.
const cMix = new CustomSignalMix();

// Use.
cMix.something = "yes";
cMix.hasSomething(); // true
cMix.listenTo("doSomething", (...things) => { });

```
- You can also use constructor arguments.
- If the mixin uses args, it uses the first arg(s) and pass the rest further as `(...passArgs)`.

```typescript

// Let's define a custom class with constructor args.
class CustomBase {
    someMember: boolean;
    constructor(someMember: boolean) {
        this.someMember = someMember;
    }
}

// Let's mix in typed DataMan features.
interface MyData { something: { deep: boolean; }; simple: string; }
class CustomDataMix extends (DataManMixin as ClassMixer<DataManType<MyData>>)(CustomBase) {

    // Optional constructor. If you need a constructor, it could look like this.
    constructor(data: MyData, someMember: boolean) {
        super(data, someMember);
    }

}

// Create like any class.
const cMix = new CustomDataMix({ something: { deep: true }, simple: "" }, false);

// Use.
cMix.listenToData("something.deep", "simple", (deep, simple) => { });


```
- And you can of course mix many mixins, one after the other.

```typescript

// Mix DataMan and SignalMan upon CustomBase.
class MyMultiMix extends DataManMixin(SignalManMixin(CustomBase)) {}

// The same thing as above happens to be also available as a mixin already.
class MyMultiMix extends SignalDataManMixin(CustomBase) {}

// Note that you can do the same typing tricks as above using the ClassMixer type.
// .. Note also that you can use ClassMixer for your own custom mixins - see the source code.

```

---

## 2. CONTEXT CLASSES

### Context

- `Context` extends `SignalDataMan` and provides synced data refreshes and signalling.
- The data refreshes are triggered simultaneously after a common timeout (vs. separately at DataMan level), and default to 0ms timeout.
- The signalling part is synced to the refresh cycle using "pre-delay" and "delay" options.
    * The "pre-delay" is tied to context's refresh cycle set by the `{ refreshTimeout: number | null; }` setting.
    * The "delay" happens after all the connected `ContextAPI`s have resolved their `awaitDelay` promise.
    * Note that "pre-delay" signals are called right before data listeners, while "delay" always after them.

```typescript

// Prepare initial data and settings.
const initialData = { something: { deep: true }, simple: "yes" };
const settings: { refreshTimeout?: number | null; } = {}; // Defaults to 0ms, null means synchronous, undefined uses default.

// Extra typing - just to showcase Context<Data, Signals>.
type Data = typeof initialData;
type Signals = { doIt: (what: number) => void; whatIsLife: (whoAsks: string) => Promise<number>; };

// Create a context.
const myContext = new Context<Data, Signals>(initialData, settings);

// Get data.
myContext.getData(); // { something: { deep: true }, simple: "yes" }
myContext.getInData("something.deep"); // true

// Listen to data and signals.
myContext.listenToData("something.deep", "simple", (deep, simple) => { console.log(deep, simple); });
myContext.listenToData("something.deep", (deepOrFallback) => { }, [ "someFallback" ]); // Custom fallback if data is undefined.
myContext.listenTo("doIt", (what) => { console.log(what); });
myContext.listenTo("whatIsLife", (whoAsks) => new Promise(res => res(whoAsks === "me" ? 0 : -1)));

// Trigger changes.
// .. At Contexts level data refreshing uses 0ms timeout by default, and refreshes are always triggered all in sync.
myContext.setData({ simple: "no" });
myContext.setInData("something.deep", false);
myContext.refreshData("something.deep"); // Trigger a refresh manually.
myContext.refreshData(["something.deep", "simple"], 5); // Add keys and force the next cycle to be triggered after 5ms timeout.
myContext.refreshData(true, null); // Just refresh everything, and do it now (with `null` as the timeout).

// Send a signal.
myContext.sendSignal("doIt", 5);

// Send a more complex signal.
const livesAre = await myContext.sendSignalAs("await", "whatIsLife", "me"); // number[]
const lifeIsAfterAll = await myContext.sendSignalAs(["delay", "await", "first"], "whatIsLife", "me"); // number | undefined
//
// <-- Using "pre-delay" ties to context's refresh cycle, while "delay" ties to once all related contextAPIs have refreshed.

```

### ContextAPI

- `ContextAPI` provides communication with multiple _named_ `Context`s.
- When a ContextAPI is hooked up to a context, it can use its data and signalling services.
    * In this sense, ContextAPI provides a stable reference to potentially changing set of contexts.
- The ContextAPI's optional `awaitDelay` method affects the "delay" refresh cycle of Contexts (by the returned promise).
    * The default implementation resolves the promise instantly, but can be overridden (for external syncing).
    * The Context's "delay" cycle is resolved once all the connected ContextAPIs have been awaited.
    * I's totally fine to override the method externally: `myContextAPI.awaitDelay = async () => await someProcess()`.

```typescript

// Typing for multiple contexts.
type CtxSettingsData = { something: { deep: boolean; }; simple: string; };
type CtxUserData = { info: { name: string; avatar: string; } | null; };
type CtxUserSignals = {
    loggedIn: (userInfo: { name: string; avatar: string; }) => void;
    whatIsLife: (whoAsks: string) => Promise<number>;
};
type AllContexts = {
    settings: Context<CtxSettingsData>;
    user: Context<CtxUserData, CtxUserSignals>;
};

// Or, say we have created them.
const allContexts: AllContexts = {
    settings: new Context<CtxSettingsData>({ something: { deep: true }, simple: "yes" }),
    user: new Context<CtxUserData, CtxUserSignals>({ info: null })
};

// Create a stand alone contextAPI instance.
const cApi = new ContextAPI(allContexts);
// const cApi = new ContextAPI<AllContexts>(); // Without initial contexts, but typing yes.

// Set and get contexts later on.
cApi.setContexts(allContexts);
cApi.setContext("settings", allContexts.settings);
cApi.getContexts(); // AllContexts
cApi.getContext("user"); // Context<CtxUserData, CtxUserSignals> | undefined

// Get data.
cApi.getInData("settings"); // CtxSettingsData | undefined
cApi.getInData("settings.something.deep"); // boolean | undefined
cApi.getInData("settings.something.deep", false); // boolean

// Listen to signals.
cApi.listenTo("user.loggedIn", (userInfo) => { console.log(userInfo); }); // logs: { name, avatar }
cApi.listenTo("user.whatIsLife", (whoAsks) => new Promise(res => res(whoAsks === "me" ? 0 : -1)));

// Listen to data.
// .. As contexts might come and go, the type has `| undefined` fallback.
cApi.listenToData("settings.something.deep", "settings.simple", (deep, simple) => { console.log(deep, simple); });
// .. To use custom, provide custom fallback.
cApi.listenToData("settings.something.deep", (deep) => { }, [false]); // boolean
cApi.listenToData("settings.something.deep", (deep) => { }, ["someFallback" as const]); // boolean | "someFallback"
cApi.listenToData("settings.something", "settings.simple", (something, simple) => { }, [{ deep: 1 }, ""] as const);
cApi.listenToData({ "settings.something.deep": 0 as const, "settings.simple": "" }, (values) => {
    values["settings.something.deep"]; // boolean | 0
    values["settings.simple"]; // string
});

// Trigger changes.
// .. At Contexts level data refreshing uses 0ms timeout by default, and refreshes are always triggered all in sync.
cApi.setInData("settings", { simple: "no" }); // Extends already by default, so "something" won't disappear.
cApi.setInData("settings", { simple: "no" }, false); // This would make "something" disappear, but typing prevents it.
cApi.setInData("settings.something.deep", false);  // Even if "something" was lost, this would re-create the path to "something.deep".
cApi.refreshData("settings.something.deep"); // Trigger a refresh manually.
cApi.refreshData(["settings.something.deep", "user.info"], 5); // Add keys and force the next cycle to be triggered after 5ms timeout.
cApi.refreshData(["settings", "user"], null); // Just refresh both contexts fully, and do it instantly (with `null` as the timeout).

// Override the awaitDelay timer - it will affect when "delay" signals are resolved for all connected contexts.
cApi.awaitDelay = () => new Promise((resolve, reject) => { window.setTimeout(resolve, 500); }); // Just to showcase.
cApi.awaitDelay = async () => await someExternalProcess();

// Send a signal.
cApi.sendSignal("user.loggedIn", { name: "Guest", avatar: "" });

// Send a more complex signal.
const livesAre = await cApi.sendSignalAs("await", "user.whatIsLife", "me"); // number[]
const lifeIsAfterAll = await cApi.sendSignalAs(["delay", "await", "first"], "user.whatIsLife", "me"); // number | undefined
//
// <-- Using "pre-delay" is synced to context's refresh cycle, while "delay" to once all related contextAPIs have refreshed.

```

---

## 3. STATIC LIBRARY METHODS

- The `areEqual(a, b, depth?)` and `deepCopy(anything, depth?)` are fairly self explanatory: they compare or copy data with custom level of depth.
- Memos, triggers and data sources are especially useful in state based refreshing systems that compare previous and next state to determine refreshing needs. The basic concept is to feed argument(s) to a function, who performs a comparison on them to determine whether to trigger change (= a custom callback).

### library: areEqual

- The `areEqual(a, b, depth?)` compares data with custom level of depth.
- If depth is under 0, checks deeply. Defaults to -1.

```typescript

// Basic usage.
const test = { test: true };
areEqual(true, test); // false, clearly not equal.
areEqual(test, { test: true }); // true, contents are equal when deeply check.
areEqual(test, { test: true }, 1); // true, contents are equal when shallow checked.
areEqual(test, { test: true }, 0); // false, not identical objects.
areEqual(test, test, 0); // true, identical objects.

```

### library: deepCopy

- The `deepCopy(anything, depth?)` copies the data with custom level of depth.
- If depth is under 0, copies deeply. Defaults to -1.

```typescript

// Prepare.
const original = { something: { deep: true }, simple: "yes" };
let copy: typeof original;
// Basic usage.
copy = deepCopy(original); // Copied deeply.
copy = deepCopy(original, 1); // Copied one level, so original.something === copy.something.
copy = deepCopy(original, 0); // Did not copy, so original === copy.

```

### library: createDataMemo

- `createDataMemo` helps to reuse data in simple local usages. By default, it only computes the data if any of the arguments have changed.

```typescript

// Create a function that can be called to return updated data if arguments changed.
const myMemo = createDataMemo(
    // 1st arg is the producer callback that should return the desired data.
    // .. It's only triggered when either (a, b) is changed from last time.
    (a, b) => {
        // Do something with the args.
        return a.score > b.score ? { winner: a.name, loser: b.name } :
            a.score < b.score ? { winner: b.name, loser: a.name } : 
            { winner: null, loser: null };
    },
    // 2nd arg is optional and defines the _level of comparison_ referring to each argument.
    // .. For DataMemo it defaults to 0, meaning identity comparison on each argument: oldArg[i] !== newArg[i].
    // .. To do a deep comparison set to -1. Setting of 1 means shallow comparison (on each arg), and from there up.
    0,
);

// Use the memo.
const { winner, loser } = myMemo({ score: 3, name: "alpha"}, { score: 5, name: "beta" }); // { winner: "beta", loser: "alpha" }

```

### library: createDataTrigger

- `createDataTrigger` is similar to DataMemo, but its purpose is to trigger a callback on mount.
- In addition, the mount callback can return another callback for unmounting, which is called if the mount callback gets overridden upon usage (= when memory changed and a new callback was provided).

```typescript

// Create a function that can be called to trigger a callback when the reference data is changed from the last time
type Memory = { id: number; text: string; };
const myTrigger = createDataTrigger<Memory>(
    // 1st arg is an optional (but often used) _mount_ callback.
    (newMem, oldMem) => {
        // Run upon change.
        if (newMem.id !== oldMem.id)
            console.log("Id changed!");
        // Optionally return a callback to do _unmounting_.
        return (currentMem, nextMem) => { console.log("Unmounted!"); }
    },
    // 2nd arg is optional initial memory.
    // .. Use it to delay the first triggering of the mount callback (in case the same on first usages).
    { id: 1, text: "init" },
    // 3rd arg is optional depth, defaults to 1, meaning performs shallow comparison on the memory.
    1
);

// Use the trigger.
let didChange = myTrigger({ id: 1, text: "init" }); // false, new memory and init memory have equal contents.
didChange = myTrigger({ id: 1, text: "thing" }); // true
didChange = myTrigger({ id: 2, text: "thing" }); // true, logs: "Id changed!"
didChange = myTrigger({ id: 2, text: "thing" }, true); // true

// Change callback.
const newCallback = () => { console.log("Changes!"); };
didChange = myTrigger({ id: 2, text: "thing" }, false, newCallback); // false
didChange = myTrigger({ id: 3, text: "thing" }, false, newCallback); // true, logs: "Unmounted!" and then "Changes!".
didChange = myTrigger({ id: 3, text: "now?" }); // true, logs: "Changes!"

```

### library: createDataSource

- `createDataSource` returns a function for reusing/recomputing data.
- The function receives custom arguments and uses an extractor to produce final arguments for the producer.
- The producer is triggered if the args count or any arg has changed: `newArgs.some((v, i) !== oldArgs[i])`.
- The level of comparison can be customized by the optional 3rd argument. Defaults to 0: if any arg not identical.

```typescript

// Prepare.
type MyParams = [ colorTheme: { mode?: "light" | "dark" }, specialMode?: boolean];
type MyData = { theme: "dark" | "light"; special: boolean; }

// With pre-typing.
const mySource = (createDataSource as CreateDataSource<MyParams, MyData>)(
    // Extractor - showcases the usage for contexts.
    // .. For example, if has many usages with similar context data needs.
    (colorTheme, specialMode) => [
        colorTheme?.mode || "dark",
        specialMode || false,
    ],
    // Producer - it's only called if the extracted data items were changed from last time.
    (theme, special) => ({ theme, special }),
    // Optional depth of comparing each argument.
    // .. Defaults to 0: if any arg (or arg count) is changed, triggers the producer.
    0
);

// With manual typing.
const mySource_MANUAL = createDataSource(
    // Extractor.
    (...[colorTheme, specialMode]: MyParams) => [
        colorTheme?.mode || "dark",
        specialMode || false,
    ],
    // Producer.
    (theme, special): MyData => ({ theme, special }),
    // Optional depth of comparing each argument.
    0
);

// Test.
const val = mySource({ mode: "dark" }, true);
const val_FAIL = mySource({ mode: "FAIL" }, true); // The "FAIL" is red-underlined.
const val_MANUAL = mySource_MANUAL({ mode: "dark" }, true);
const val_MANUAL_FAIL = mySource_MANUAL({ mode: "FAIL" }, true); // The "FAIL" is red-underlined.

```

### library: createCachedSource

- `createCachedSource` is like multiple `createDataSource`s together separated by the unique cache key.
- The key key for caching is derived from an extra "cacher" function dedicated to this purpose - it should return the cache key (string).
- The cacher receives the same arguments as the extractor, but also the cached dictionary as an extra argument `(...args, cached) => string`.

```typescript

// Let' use the same MyData as above, but add cacheKey to args.
type MyCachedParams = [
    colorTheme: { mode?: "light" | "dark" },
    specialMode: boolean | undefined,
    cacheKey: string
];

// With pre-typing.
const mySource = (createDataSource as CreateCachedSource<MyCachedParams, MyData>)(
    // Extractor.
    (colorTheme, specialMode) => [colorTheme?.mode || "dark", specialMode || false],
    // Producer.
    (theme, special) => ({ theme, special }),
    // Cache key generator.
    (_theme, _special, cacheKey) => cacheKey,
    // Optional depth.
    0
);

// With manual typing.
const mySource_MANUAL = createCachedDataSource(
    // Extractor.
    (...[colorTheme, specialMode]: MyCachedParams) => [colorTheme?.mode || "dark", specialMode || false],
    // Producer.
    (theme, special): MyData => ({ theme, special }),
    // Cache key generator.
    (_theme, _special, cacheKey) => cacheKey,
    // Optional depth.
    0
);

// Test. Let's say state1 and state2 variants come from somewhere.
let val1 = mySource(state1a, state1b, "someKey"); // In one place.
let val2 = mySource(state2a, state2b, "anotherKey"); // In another place with similar data.
// We can do it again, and the producers won't be retriggered (unlike without caching).
val1 = mySource(state1a, state1b, "someKey");
val2 = mySource(state2a, state2b, "anotherKey");

```
