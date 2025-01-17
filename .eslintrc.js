/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
    root: true,
    extends: [
        'plugin:vue/vue3-recommended',
        'prettier',
    ],
    env: {
        'vue/setup-compiler-macros': true,
    },
    overrides: [
        {
            files: ['cypress/integration/**.spec.{js,ts,jsx,tsx}'],
            extends: ['plugin:cypress/recommended'],
            plugins: [
                "cypress"
            ],
        },
    ],
}
