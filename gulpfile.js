const del = require('del');
const gulp = require('gulp');
const typescript = require('gulp-tsc');
const zip = require('gulp-zip');

gulp.task('deploy', function () {
    return gulp.src(['app/**/*'])
        .pipe(zip('deploy.zip'))
        .pipe(gulp.dest('./'));
});

const fs = require('fs');

gulp.task('compile', function () {
    return gulp.src(['src/**/*.ts', '!**/node_modules/**'])
        .pipe(typescript())
        .pipe(gulp.dest('app'))
});

gulp.task('copy-json', function () {
    return gulp.src(['src/**/*.json'])
        .pipe(gulp.dest('app'))
});

gulp.task('copy-templates', function () {
    return gulp.src(['src/Utilities/EmailTemplate/**/*'])
        .pipe(gulp.dest('app/Utilities/EmailTemplate'))
});

gulp.task('copy-sqlFiles', function () {
    return gulp.src(['src/SQLQuery/**/*.sql'])
        .pipe(gulp.dest('app/SQLQuery'))
});

gulp.task('copy-executable', function () {
    return gulp.src(['bin/**/*'])
        .pipe(gulp.dest('app/bin'))
});

gulp.task('build', ['compile', 'copy-templates', 'copy-json', 'copy-sqlFiles', 'copy-executable']);

gulp.task('clean', function () {
    return del(['app']);
});