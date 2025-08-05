module.exports = {
  dependencies: {
    'react-native-vector-icons': {
      platforms: {
        ios: {
          project: './ios/QaaqConnect.xcodeproj',
        },
        android: {
          sourceDir: '../node_modules/react-native-vector-icons/android',
          packageImportPath: 'import io.github.oblador.vectoricons.VectorIconsPackage;',
        },
      },
    },
  },
};