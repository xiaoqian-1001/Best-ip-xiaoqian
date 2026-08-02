/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        chinese: ['xiaolai', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'sans-serif'],
        english: ['Cascadia Code', 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'monospace'],
        mixed: ['Cascadia Code', 'xiaolai', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'monospace', 'sans-serif'],
      },
    },
  },
}