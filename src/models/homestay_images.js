"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Homestay_images extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Homestay_images.init(
    {
      image_id: DataTypes.INTEGER,
      homestay_id: DataTypes.BIGINT,
      image_url: DataTypes.STRING(255),
      alt_textL: DataTypes.STRING(255),
      is_thumbnail: DataTypes.BOOLEAN,
      position: DataTypes.INTEGER,
      created_at: DataTypes.DATE,
      updated_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "Homestay_images",
    }
  );
  return Homestay_images;
};
