const { parallel, series, src, dest } = require('gulp');
const babel = require('gulp-babel');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');

const buildJs = function (done) {
  return (
    src('./src/js/*.js')
    .pipe(concat('app.js'))
    .pipe(babel({
      presets: [
        [ '@babel/env',
          { modules : false}
        ]
      ]
    })
    )
    //.pipe(uglify())
    .pipe(dest('./dist'))
  );
};

const buildCss = function (done) {
  return (
    src('./src/css/*.css')
    .pipe(concat('style.css'))
    .pipe(dest('./dist'))
  );
};

const buildHtml = function (done) {
  return (
    src('./src/index.html')
    .pipe(dest('./dist'))
  );
};

exports.default = parallel(buildJs, buildCss, buildHtml);
