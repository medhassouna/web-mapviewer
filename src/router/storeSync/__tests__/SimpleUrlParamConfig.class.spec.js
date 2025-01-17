import { describe, it } from 'vitest'
import { expect } from 'chai'
import SimpleUrlParamConfig from '@/router/storeSync/SimpleUrlParamConfig.class'

describe('Test all SimpleUrlParamConfig class functionalities', () => {
    const fakeStore = {
        test: 'test',
    }
    const defaultOptions = {
        urlParamName: 'test',
        mutationToWatch: 'test',
        dispatchChangeTo: 'test',
        extractValueFromStore: () => 'test',
        keepValueInUrlWhenEmpty: true,
        valueType: String,
    }
    const createTestInstance = (options = {}) => {
        const {
            urlParamName,
            mutationToWatch,
            dispatchChangeTo,
            extractValueFromStore,
            keepValueInUrlWhenEmpty,
            valueType,
        } = Object.assign(defaultOptions, options)
        return new SimpleUrlParamConfig(
            urlParamName,
            mutationToWatch,
            dispatchChangeTo,
            extractValueFromStore,
            keepValueInUrlWhenEmpty,
            valueType
        )
    }

    describe('outputs the correct type with the readFromStore function', () => {
        it('returns undefined if the store given in param is undefined', () => {
            const testInstance = createTestInstance()
            expect(testInstance.readValueFromStore(null)).to.be.undefined
        })
        it('outputs string correctly', () => {
            const testInstance = createTestInstance({
                valueType: String,
            })
            expect(testInstance.readValueFromStore(fakeStore)).to.be.a('string').that.eq('test')
        })
        it('outputs boolean correctly', () => {
            let valueInStore = true
            const testInstance = createTestInstance({
                valueType: Boolean,
                extractValueFromStore: () => valueInStore,
            })
            expect(testInstance.readValueFromStore(fakeStore))
                .to.be.a('boolean')
                .that.eq(valueInStore)
            valueInStore = false
            expect(testInstance.readValueFromStore(fakeStore))
                .to.be.a('boolean')
                .that.eq(valueInStore)
        })
        it('outputs numbers correctly', () => {
            const testInstance = createTestInstance({
                valueType: Number,
                extractValueFromStore: () => 123,
            })
            expect(testInstance.readValueFromStore(fakeStore)).to.be.a('number').that.eq(123)
        })
    })
    describe('outputs the correct type while reading values from the query', () => {
        it('returns undefined if the query given in param is undefined', () => {
            const testInstance = createTestInstance()
            expect(testInstance.readValueFromQuery(null)).to.be.undefined
        })
        describe('boolean', () => {
            it('outputs boolean correctly when they stay in the URL when false', () => {
                const testInstance = createTestInstance({
                    keepValueInUrlWhenEmpty: true,
                    valueType: Boolean,
                })
                expect(testInstance.readValueFromQuery({ test: 'true' }))
                    .to.be.a('boolean')
                    .that.eq(true)
                expect(testInstance.readValueFromQuery({ test: 'false' }))
                    .to.be.a('boolean')
                    .that.eq(false)
            })
            it('outputs boolean correctly when they are removed from the URL when false', () => {
                const testInstance = createTestInstance({
                    keepValueInUrlWhenEmpty: false,
                    valueType: Boolean,
                })
                expect(testInstance.readValueFromQuery({ test: 'true' }))
                    .to.be.a('boolean')
                    .that.eq(true)
                expect(
                    testInstance.readValueFromQuery({}),
                    'It should return false when the param is not found in the query and keepValueInUrlWhenEmpty is false'
                )
                    .to.be.a('boolean')
                    .that.eq(false)
            })
        })
        describe('string', () => {
            it('outputs string correctly', () => {
                const testInstance = createTestInstance({
                    valueType: String,
                })
                expect(testInstance.readValueFromQuery({ test: 'test' }))
                    .to.be.a('string')
                    .that.eq('test')
            })
            it('outputs an empty string for a string that is not present in the URL (with keepValueInUrlWhenEmpty=false)', () => {
                const testInstance = createTestInstance({
                    valueType: String,
                    keepValueInUrlWhenEmpty: false,
                })
                expect(testInstance.readValueFromQuery({})).to.eq('')
            })
        })
        describe('number', () => {
            it('outputs numbers correctly', () => {
                const testInstance = createTestInstance({
                    valueType: Number,
                })
                expect(testInstance.readValueFromQuery({ test: '123' }))
                    .to.be.a('number')
                    .that.eq(123)
            })
            it('outputs zero for a number that is not present in the URL (with keepValueInUrlWhenEmpty=false)', () => {
                const testInstance = createTestInstance({
                    valueType: Number,
                    keepValueInUrlWhenEmpty: false,
                })
                expect(testInstance.readValueFromQuery({})).to.eq(0)
            })
        })
    })
    describe('Testing valuesAreDifferentBetweenQueryAndStore', () => {
        describe('boolean', () => {
            it('tells when a boolean, that stays in the URL when false, has changed', () => {
                const testInstance = createTestInstance({
                    valueType: Boolean,
                    keepValueInUrlWhenEmpty: true,
                    extractValueFromStore: (store) => store['test'],
                })
                expect(
                    testInstance.valuesAreDifferentBetweenQueryAndStore(
                        { test: 'false' },
                        { test: true }
                    )
                ).to.be.true
                expect(
                    testInstance.valuesAreDifferentBetweenQueryAndStore(
                        { test: 'false' },
                        { test: false }
                    )
                ).to.be.false
            })
            it("tells when a boolean, that doesn't stay in the URL when false, has changed", () => {
                const testInstance = createTestInstance({
                    valueType: Boolean,
                    keepValueInUrlWhenEmpty: false,
                    extractValueFromStore: (store) => store['test'],
                })
                expect(
                    testInstance.valuesAreDifferentBetweenQueryAndStore({}, { test: true }),
                    "It should detect that the value in the store is true and that the query doesn't contain this param"
                ).to.be.true
                expect(
                    testInstance.valuesAreDifferentBetweenQueryAndStore(
                        { test: 'true' },
                        { test: false }
                    ),
                    "It should detect that the store's value is false, and the query's value is true"
                ).to.be.true
                expect(
                    testInstance.valuesAreDifferentBetweenQueryAndStore({}, { test: false }),
                    'It should detect that the the lack of the URL param means the value in the store is false'
                ).to.be.false
            })
        })
        describe('string', () => {
            it('tells when a string, that stays in the URL when empty, has changed', () => {
                const testInstance = createTestInstance({
                    valueType: String,
                    extractValueFromStore: (store) => store['test'],
                })
                expect(
                    testInstance.valuesAreDifferentBetweenQueryAndStore(
                        { test: 'test' },
                        { test: 'test' }
                    ),
                    'String values are equals, URL should not change'
                ).to.be.false
                expect(
                    testInstance.valuesAreDifferentBetweenQueryAndStore(
                        { test: 'not-test' },
                        { test: 'test' }
                    ),
                    'String value is not the same between store and URL, should return true'
                ).to.be.true
            })
            it("tells when a string, that doesn't says in the URL when empty, has changed", () => {
                const testInstance = createTestInstance({
                    valueType: String,
                    keepValueInUrlWhenEmpty: false,
                    extractValueFromStore: (store) => store['test'],
                })
                expect(
                    testInstance.valuesAreDifferentBetweenQueryAndStore({}, { test: 'test' }),
                    'Should detect when the param is not found in the URL but it has a value in the store'
                ).to.be.true
                expect(
                    testInstance.valuesAreDifferentBetweenQueryAndStore(
                        { test: 'test' },
                        { test: '' }
                    ),
                    'Should detect when the param is found in the URL but it is empty in the store'
                ).to.be.true
                expect(
                    testInstance.valuesAreDifferentBetweenQueryAndStore({}, { test: '' }),
                    "Should not tell there's a difference when the query is empty and the store value too"
                ).to.be.false
            })
        })
        describe('numbers', () => {
            it('tells when a number, that stays in the URL when zero, has changed', () => {
                const testInstance = createTestInstance({
                    valueType: Number,
                    extractValueFromStore: (store) => store['test'],
                })
                expect(
                    testInstance.valuesAreDifferentBetweenQueryAndStore({ test: 0 }, { test: 1 })
                ).to.be.true
            })
            it("tells when a number, that doesn't stays in the URL when zero, has changed", () => {
                const testInstance = createTestInstance({
                    valueType: Number,
                    extractValueFromStore: (store) => store['test'],
                })
                expect(testInstance.valuesAreDifferentBetweenQueryAndStore({}, { test: 1 })).to.be
                    .true
                expect(
                    testInstance.valuesAreDifferentBetweenQueryAndStore({ test: 1 }, { test: 0 })
                ).to.be.true
                expect(testInstance.valuesAreDifferentBetweenQueryAndStore({}, { test: 0 })).to.be
                    .false
            })
        })
    })
})
