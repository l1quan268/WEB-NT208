"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert("Users", [
      {
        user_id: 1,
        role: "admin",
        name: "Quản trị viên",
        email: "admin@sweethome.com",
        password_hash: "$2a$10$hashedPassword", // Mật khẩu đã hash
        phone: "0987654321",
        gender: "male",
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
  },
};
