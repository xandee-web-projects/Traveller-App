const express = require('express');
const app = express();
const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const expressLayouts = require("express-ejs-layouts")
const utils = require("./utils.js")
const multer = require("multer")
const md5 = require("blueimp-md5")

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, '../../uploads/')
	},
	filename: (req, file, cb) => {
		fname = file.originalname.split(".")
		ext = fname[fname.length - 1]
		var hsh = md5(file.originalname+Math.random().toString()+new Date().toISOString())
		cb(null, hsh+"."+ext)
	}
})
const fileFilter = (req, file, cb) => {
	if (file.mimetype == "image/jpeg" || file.mimetype == "image/png") cb(null, true)
	else cb(null, false)

}
const upload = multer({storage: storage, fileFilter:fileFilter})


app.use(express.json());
app.use(cookieParser('NotSoSecret'));
app.use(session({
	secret: 'something',
	cookie: { maxAge: 60000 },
	resave: true,
	saveUninitialized: true
}));
app.use(flash());
var catalyst = require('zcatalyst-sdk-node');

app.engine('.html', require('ejs').__express);
app.set("view engine", "html")
app.set("views", "client")
app.set("layout", "layouts/layout")
app.use(expressLayouts)
app.use(express.urlencoded({ extended: true }))
app.use(express.static("public"))
app.use(express.static("../../uploads"))

app.get("/", (req, res) => {
	res.render("index")
})

app.get("/service", (req, res) => {
	res.render("service")
})

app.get("/sign-up", (req, res) => {
	var message = req.flash("msg")
	res.render("signup", { message })
})

app.post("/sign-up", async (req, res) => {
	var c = catalyst.initialize(req)
	let userManagement = c.userManagement();
	var signupConfig = {
		platform_type: 'web',
		zaid: 10046576346
	};
	var userConfig = {
		first_name: req.body.first_name,
		last_name: req.body.last_name,
		email_id: req.body.email,
		role_id: '7304000000004182'
	};

	let registerPromise = userManagement.registerUser(signupConfig, userConfig);
	await registerPromise.then(userDetails => {
		req.flash("msg", ["Check your email for confirmation", "success"])
		res.redirect(req.get("referrer"))
	});
	req.flash("msg", ["Request could not be completed", "danger"])
	res.redirect(req.get("referrer"))
})

app.get("/sign-in", (req, res) => {
	res.render("signin")
})

app.get("/packages", async (req, res) => {
	utils.initialize(req, true)
	var packages = await utils.queryTable(`select * from Package`)
	console.log(packages)
	res.render("package", {packages})
})

app.get("/contact", (req, res) => {
	let message = req.flash("msg")
	res.render("contact", { message })
})

app.get("/single/:prod_id", async (req, res) => {
	utils.initialize(req, true)
	var package = await utils.queryTable(`select * from Package where ROWID=${req.params.prod_id}`)
	res.render("single", { package:package[0].Package })
})

app.get("/bookpackage", async (req, res) => {
	var package_id = req.query.id
	utils.initialize(req, true)
	var package = await utils.queryTable(`select * from Package where ROWID=${req.params.prod_id}`)
	res.render("single", { package:package[0].Package })
})

app.post("/contact", async (req, res) => {
	utils.initialize(req, true)
	await utils.addRowInTable("ContactMessage", { name: req.body.name, email: req.body.email, subject: req.body.subject, message: req.body.message })
	.then((row) => {
		req.flash("msg", ["Message sent!", "success"])
	}).catch(err => {
		req.flash("msg", ["Message was not sent :(", "danger"])
		console.log("rowData insertion failed " + err);
	});
	res.redirect("contact")
})

app.get("/admin", (req, res) => {
	message = req.flash("msg")
	res.render("admin", { message })
})

app.post("/admin", upload.array("productImage", 2), async (req, res) => {
	utils.initialize(req, true)
	mainImg = req.files[0].filename
	subImg = req.files[1].filename
	console.log()
	await utils.addRowInTable("Package", {...req.body, mainImg, subImg})
	.then(row => {
		req.flash("msg", ["Package added", "success"])
	})
	.catch(err => {
		req.flash("msg", ["Package not added", "danger"])
		console.log("Row not inserted error: "+err)
	})
	res.json("Worked")
})


module.exports = app;
// app.listen(3000)