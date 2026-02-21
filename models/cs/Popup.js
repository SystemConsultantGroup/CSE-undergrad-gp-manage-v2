module.exports = function(sequelize, DataTypes) {
    var Popup = sequelize.define("Popup", {
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        text: {
            type: DataTypes.TEXT,
            defaultValue: "",
            comment: "(내용 컬럼인데 타이틀만 필요하면 지우기)"
        },
        start: {
            type: DataTypes.DATE,
            allowNull: false
        },
        end: {
            type: DataTypes.DATE,
            allowNull: false
        },
        path: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: "업로드한 이미지 경로 또는 파일명"
        },
        height: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "100%",
            comment: "높이 : px or %"
        },
        width: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "100%",
            comment: "넓이 : px or %"
        },
        link: {
            type: DataTypes.STRING
        }
    }, {
        tableName: 'cs_popup',
        comment: "cs 팝업"
    });
    return Popup;
};