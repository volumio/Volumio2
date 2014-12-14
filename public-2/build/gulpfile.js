/**
 * Gulp file
 * Requires global NodeJS modules: gulp
 */

"use strict";

var
	// general modules
	fs = require("fs"),
	args = require("yargs").argv,
	del = require("del"),
	path = require("path"),
	merge = require("merge-stream"),

	// gulp
	gulp = require("gulp"),
	strip = require('gulp-strip-comments'),
	gutil = require("gulp-util"),
	concat = require("gulp-concat"),
	bust = require("gulp-buster"),
	debug = require("gulp-debug"),
	changed = require("gulp-changed"),

	// gulp css
	cssBust = require("gulp-css-cache-bust"),
	sass = require("gulp-sass"),
	gcmq = require("gulp-group-css-media-queries"),
	minifyCSS = require("gulp-minify-css"),
	autoprefixer = require("gulp-autoprefixer"),
	pixrem = require("gulp-pixrem"),

	// gulp javascript
	jsUglify = require("gulp-uglify"),

	mainPath = "/WebUI-NODE/public-2",

// declarations, with trailing slash
	paths = {
		clientCode:              mainPath,
		css:                     mainPath + "/css",
		cssDevelopment:          mainPath + "/dev-css/",
		javascriptDevelopment:   mainPath + "/dev-javascript/",
		javascript:              mainPath + "/javascript/"
	},
	settings = {
		browserSupport : [
			"> 2%",
			"last 2 versions",
			"ie > 9"
		], // The browsers we want to support still.
		compatibility: "ie8", // Sets backwards compatibility for minifying css on browsers.
		imagePath : "/images", // image path
		precision : 6, // The precision of floats to enhance visual measurement performance (in percentage use).
		outputStyle : "compressed",
		removeUnneededPrefixes : true, // The setting to remove unneeded prefixes.
		cascadeVisually : false, // Formats the output to have a visual cascaded view.
		remToPixelRatio : "10px" // Amount of pixels relative to the rems.
	},
	versionCacheFile =
	{
		versionFileDestination : "fileVersions/", // end with trailing slash
		css : "cssVersions.json",
		cssGroup : "cssGroupVersions.json",
		js : "jsVersions.json",
		jsGroup : "jsGroupVersions.json"
	};


/**
 * Get all folders inside the given folder.
 * @param dir
 * @returns {Array|*}
 */
var getFolders = function(dir)
{
	console.log("entering dir:" + dir);

	return fs.readdirSync(dir)
		.filter(function (file) {
			return fs.statSync(path.join(dir, file)).isDirectory();
		});
}


/**** CSS file automation ****/
/**
 * Cleans out all css files.
 */
gulp.task("clean-css", function (cb) {
	del([paths.css + "/**/*"],
		{force: true},
		cb);
});

/**
 * Compile the sass files to css for development.
 */
gulp.task("compile-sass-development", ["clean-css"], function () {
	return gulp.src(paths.cssDevelopment + "/**/*.scss")
		.pipe(sass({
			errLogToConsole: true,
			includePaths: [paths.cssDevelopment],
			imagePath: settings.imagePath,
			outputStyle: settings.outputStyle,
			precision: settings.precision,
			sourceComments: "map"
		}))
		.pipe(autoprefixer({
			browsers: settings.browserSupport,
			cascade: settings.cascadeVisually,
			remove: settings.removeUnneededPrefixes
		}))
		// .pipe(pixrem(settings.remToPixelRatio))
		.pipe(cssBust({base: paths.clientCode}))
		.pipe(gulp.dest(paths.css));
});

gulp.task("compile-sass-development-changed-only", function () {
	return gulp.src(paths.cssDevelopment + "/**/*.scss")
		.pipe(changed(paths.css, {extension: '.css'}))
		// .pipe(debug({verbose: false}))
		.pipe(sass({
			errLogToConsole: true,
			includePaths: [paths.cssDevelopment],
			imagePath: settings.imagePath,
			outputStyle: settings.outputStyle,
			precision: settings.precision,
			sourceComments: "map"
		}))
		.pipe(autoprefixer({
			browsers: settings.browserSupport,
			cascade: settings.cascadeVisually,
			remove: settings.removeUnneededPrefixes
		}))
		.pipe(pixrem(settings.remToPixelRatio))
		.pipe(cssBust({base: paths.clientCode}))
		.pipe(gulp.dest(paths.css));
});

/**
 * Compile, concatenate and minify to Production.
 */
gulp.task("compile-css-production", ["clean-css"], function(){

	return gulp.src(paths.cssDevelopment + "/**/*.scss")
		// .pipe(debug({verbose: true}))
		.pipe(sass({
			errLogToConsole: false,
			includePaths: [paths.cssDevelopment],
			imagePath: settings.imagePath,
			outputStyle: settings.outputStyle,
			precision: settings.precision
		}))
		.pipe(autoprefixer({
			browsers: settings.browserSupport,
			cascade: settings.cascadeVisually,
			remove: settings.removeUnneededPrefixes
		}))
		.pipe(cssBust({ base: paths.clientCode }))
		.pipe(gcmq())
		.pipe(minifyCSS({compatibility: settings.compatibility}))
		.pipe(gulp.dest(paths.css))
		.on("error", function(err){
			console.log(err);
			// log the errors to gulp-utils.
			gutil.log(err);
			process.exit(1);
		});
});

/**
 * Concatenate and optimize the group css files for release.
 */
gulp.task("compile-cssgroup-production", ["clean-css", "compile-css-production"], function ()
{

	var folders = getFolders(paths.cssGroup),
		tasks = folders.map(function (folder) {
			return gulp.src(path.join(paths.cssGroup, folder, "/**/*.css"))
				.pipe(concat(folder + ".css"))
				.pipe(gcmq())
				.pipe(minifyCSS({compatibility: settings.compatibility}))
				.pipe(gulp.dest(paths.css + "minimized/"))
				.pipe(bust(versionCacheFile.cssGroup))
				.pipe(gulp.dest(versionCacheFile.versionFileDestination + "."))
				.on("error", function(err){
					console.log(err);
					// log the errors to gulp-utils.
					gutil.log(err);
					process.exit(1);
				});
		});

	return merge(tasks);
});

gulp.task("css-concat-all", ["clean-css", "compile-css-production"], function() {
	gulp.src(paths.css + "/**/*.css")
		.pipe(concat("stylesheet.css"))
		.pipe(strip({block: true}))
		.pipe(strip({line: true}))
		.pipe(gulp.dest(paths.css + "/"));
});

/**
 * Re-run the compile css task when Scss files changes.
 */
gulp.task("watch-sass-rebuild-incremental", function () {
	var directories = [
		paths.cssDevelopment + "**/*.scss"
	];
	gulp.watch(directories, ["compile-sass-development-changed-only"])
		.on("change", function (evt)
		{
			console.log("[watcher] Incremental rebuild - File " + evt.path + " was " + evt.type + ", compiling...");
		})
});
gulp.task("watch-sass-rebuild-total", function () {

	var directories = [
		paths.cssDevelopment + "/**/_*.scss"
	];

	gulp.watch(directories, ["compile-sass-development"])
		.on("change", function (evt)
		{
			console.log("[watcher] Total rebuilding - File " + evt.path + " was " + evt.type + ", compiling...");
		})
});

/**** JavaScript file autimation ****/
/**
 * Cleans out all JavaScript files.
 */
gulp.task("clean-js", function (cb) {
	del([paths.javascript + "/**/*"],
		{force: true},
		cb);
});

/**
 * Uglifies the javascript
 */
gulp.task("compile-js-production", function(){
	gulp.src(paths.javascriptDevelopment + "/**/*.js")
		.pipe(jsUglify({inline_script: true, ie_proof: true, space_colon: true, comments: false}))
		.pipe(gulp.dest(paths.javascript + "."))
		.pipe(bust(versionCacheFile.js))
		.pipe(gulp.dest(versionCacheFile.versionFileDestination + "."))
		.on("error", function(err){
			console.log(err);
			// log the errors to gulp-utils.
			gutil.log(err);
			process.exit(1);
		});
});

gulp.task("compile-jsgroup-production", ["compile-js-production"], function ()
{
	var folders = getFolders(paths.jsGroup),
		tasks = folders.map(function (folder) {
			return gulp.src(path.join(paths.javascriptDevelopment, folder, "/**/*.js"))
				.pipe(concat(folder + ".js"))
				.pipe(gulp.dest(paths.javascript + "/"))
				.pipe(bust(versionCacheFile.jsGroup))
				.pipe(gulp.dest(versionCacheFile.versionFileDestination + "."))
				.on("error", function(err){
					console.log(err);
					// log the errors to gulp-utils.
					gutil.log(err);
					process.exit(1);
				})
		});

	return merge(tasks);
});

/**
 * Generic gulp tasks for command line use.
 */
gulp.task("generate-css-development", ["compile-sass-development"]);
gulp.task("generate-css-production", ["compile-css-production"]);
gulp.task("generate-js-production", ["compile-jsgroup-production"]);

// volumio: use "watch" command to generate on the fly for development. Run "generate-all" to compile for production use.
gulp.task("generate-all", ["css-concat-all"]);
gulp.task("watch", ["watch-sass-rebuild-incremental", "watch-sass-rebuild-total"]);
