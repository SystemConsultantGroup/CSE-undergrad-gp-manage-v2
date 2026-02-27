module.exports = function(sequelize, DataTypes) {
    var MajorProf = sequelize.define("MajorProf", {
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        position: {
            type: DataTypes.STRING,
            defaultValue: "",
            comment: "직위"
        },
        university: {
            type: DataTypes.STRING,
            defaultValue: "",
            comment: "학위 수여교"
        },
        email: {
            type: DataTypes.STRING,
            defaultValue: "",
        },
        phone: {
            type: DataTypes.STRING,
            defaultValue: ""
        },
        homepage: {
            type: DataTypes.STRING,
            defaultValue: ""
        },
        research: {
            type: DataTypes.STRING,
            defaultValue: "",
            comment: "연구 주제"
        },
        introduction: {
            type: DataTypes.TEXT,
            defaultValue: "",
            comment: "연구 소개"
        },
        lab: {
            type: DataTypes.STRING,
            defaultValue: "",
            comment: "연구실"
        },
        lab_homepage: {
            type: DataTypes.STRING,
            defaultValue: "",
            comment: "연구실 링크"
        },
        photo: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "", // 이부분 나중에 디폴드 이미지 생기면 넣어주기
        }
    }, {
        tableName: 'cs_major_professor',
        comment: "cs 전공 교수"
    });

    MajorProf.associate = function(models) {
        MajorProf.belongsTo(models.Major);
    };

    return MajorProf;
};