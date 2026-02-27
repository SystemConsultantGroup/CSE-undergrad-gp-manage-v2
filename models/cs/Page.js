module.exports = function (sequelize, DataTypes) {
  var Page = sequelize.define(
    'Page',
    {
      name: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        comment: '페이지 이름',
      },
      comment: {
        type: DataTypes.TEXT,
        defaultValue: '',
        comment: '페이지 설명',
      },
      source: {
        type: DataTypes.TEXT,
        defaultValue: '',
      },
    },
    {
      tableName: 'cs_page',
      comment: 'cs 페이지 데이터',
    },
  );

  Page.associate = function (models) {
    Page.hasMany(models.PageFile);
  };

  return Page;
};
