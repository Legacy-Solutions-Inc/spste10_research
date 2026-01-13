const { withProjectBuildGradle } = require('@expo/config-plugins');

const withJfrogVersion = (config) => {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      let buildGradle = config.modResults.contents;
      
      // Define the JFrog plugin classpath
      const jfrogClasspath = "classpath 'org.jfrog.buildinfo:build-info-extractor-gradle:4.29.2'";
      
      // Check if buildscript block exists
      if (buildGradle.includes('buildscript')) {
        // Check if any version of build-info-extractor-gradle is already present
        const existingJfrogPattern = /classpath\s+['"]org\.jfrog\.buildinfo:build-info-extractor-gradle:[^'"]+['"]/;
        
        if (existingJfrogPattern.test(buildGradle)) {
          // Replace existing version with 4.29.2
          buildGradle = buildGradle.replace(
            existingJfrogPattern,
            jfrogClasspath
          );
        } else {
          // Add the classpath dependency in the dependencies block
          // Look for dependencies { and add after it
          const dependenciesPattern = /(dependencies\s*\{)/;
          if (dependenciesPattern.test(buildGradle)) {
            buildGradle = buildGradle.replace(
              dependenciesPattern,
              `$1
        ${jfrogClasspath}`
            );
          }
        }
      } else {
        // If no buildscript block exists, we need to add it
        // This is less common but handle it anyway
        const buildscriptBlock = `buildscript {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
    dependencies {
        ${jfrogClasspath}
    }
}

`;
        // Add at the beginning of the file
        buildGradle = buildscriptBlock + buildGradle;
      }
      
      config.modResults.contents = buildGradle;
    }
    return config;
  });
};

module.exports = withJfrogVersion;
