import db from "../models/index";

let getHomePage = async (reg, res) => {
  try {
    let data = await db.User.findAll();
    return res.render("test.ejs", {
      data: JSON.stringify(data),
    });
  } catch (e) {
    console.log(e);
  }
};

module.exports = {
  getHomePage: getHomePage,
};
