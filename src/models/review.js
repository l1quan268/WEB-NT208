"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Review extends Model {
    static associate(models) {
      Review.belongsTo(models.User, { foreignKey: "user_id" });
      Review.belongsTo(models.RoomType, { foreignKey: "room_type_id" });
    }
  }
  Review.init(
    {
      review_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      room_type_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      comment: {
        type: DataTypes.TEXT,
      },
    },
    {
      sequelize,
      modelName: "Review",
      tableName: "reviews",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
      underscored: true,
    }
  );
  return Review;
};
