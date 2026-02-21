module.exports = function(sequelize, DataTypes) {
    var BoardFile = sequelize.define("BoardFile", {
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
        },
        time: {
            type: DataTypes.DATE,
            allowNull: false
        },
        ip: {
            type: DataTypes.STRING(15),
            allowNull: false,
            validate: {
                isIPv4: true
            }
        },                
    }, {
        tableName: 'cs_board_file',
        comment: "cs 게시판 게시물 첨부 파일",
        classMethods: {
            associate: function(models) {
                BoardFile.belongsTo(models.User);
                BoardFile.belongsTo(models.BoardPost);
            }
        }
    });
    return BoardFile;
};