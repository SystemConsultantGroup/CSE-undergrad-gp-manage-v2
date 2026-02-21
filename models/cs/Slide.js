module.exports = function(sequelize, DataTypes) {
    var Slide = sequelize.define("Slide", {
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        comment: {
            type: DataTypes.TEXT,
            defaultValue: ""
        },
        path: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: "업로드한 이미지 경로 또는 파일명"
        },
        order: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: "슬라이드 순서"
        }
    }, {
        tableName: 'cs_slide',
        comment: "cs 슬라이드"
    });
    return Slide;
};