module.exports = function(sequelize, DataTypes) {
    var PageFile = sequelize.define("PageFile", {
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: "업로드한 원래 파일명"
        },
        path: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: "저장한 경로 또는 파일명"
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false
        },
        size: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    }, {
        tableName: 'cs_page_file',
        comment: "cs 페이지 업로드 파일",
        classMethods: {
            associate: function(models) {
                PageFile.belongsTo(models.Page);
            }
        }
    });
    return PageFile;
};