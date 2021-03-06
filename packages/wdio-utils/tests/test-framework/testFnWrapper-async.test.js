import * as shim from '../../src/shim'
import { testFnWrapper } from '../../src/test-framework/testFnWrapper'

jest.mock('../../src/shim', () => ({
    executeHooksWithArgs: jest.fn(),
    executeAsync: async (fn, repeatTest, args = []) => fn('async', repeatTest, ...args),
    runSync: null,
}))

const executeHooksWithArgs = shim.executeHooksWithArgs

describe('testFnWrapper', () => {
    const origFn = (mode, repeatTest, arg) => `${mode}: Foo${arg} ${repeatTest}`
    const buildArgs = (specFn, retries, beforeFnArgs, afterFnArgs) => [
        'Foo',
        { specFn, specFnArgs: ['Bar'] },
        { beforeFn: 'beforeFn', beforeFnArgs },
        { afterFn: 'afterFn', afterFnArgs },
        '0-9',
        retries
    ]

    it('should run fn in async mode if not runSync', async () => {
        const args = buildArgs(origFn, undefined, () => [], () => [])
        const result = await testFnWrapper(...args)

        expect(result).toBe('async: FooBar 0')
        expect(executeHooksWithArgs).toBeCalledTimes(2)
        expect(executeHooksWithArgs).toBeCalledWith('beforeFn', [])
        expect(executeHooksWithArgs).toBeCalledWith('afterFn', [{ duration: expect.any(Number), error: undefined, result: 'async: FooBar 0', passed: true }])
    })

    it('should run fn in async mode if specFn is async', async () => {
        const args = buildArgs(async (...args) => origFn(...args), 11, () => ['beforeFnArgs'], () => ['afterFnArgs'])
        const result = await testFnWrapper(...args)

        expect(result).toBe('async: FooBar 11')
        expect(executeHooksWithArgs).toBeCalledTimes(2)
        expect(executeHooksWithArgs).toBeCalledWith('beforeFn', ['beforeFnArgs'])
        expect(executeHooksWithArgs).toBeCalledWith('afterFn', ['afterFnArgs', { duration: expect.any(Number), error: undefined, result: 'async: FooBar 11', passed: true }])
    })

    it('should throw on error', async () => {
        let expectedError
        const args = buildArgs((mode, repeatTest, arg) => {
            expectedError = new Error(`${mode}: Foo${arg} ${repeatTest}`)
            throw expectedError
        }, undefined, () => ['beforeFnArgs'], () => ['afterFnArgs'])

        let error
        try {
            await testFnWrapper(...args)
        } catch (err) {
            error = err
        }

        expect(error).toBe(expectedError)
        expect(executeHooksWithArgs).toBeCalledTimes(2)
        expect(executeHooksWithArgs).toBeCalledWith('beforeFn', ['beforeFnArgs'])
        expect(executeHooksWithArgs).toBeCalledWith('afterFn', ['afterFnArgs', { duration: expect.any(Number), error: expectedError, result: undefined, passed: false }])
    })

    afterEach(() => {
        executeHooksWithArgs.mockClear()
    })
})
