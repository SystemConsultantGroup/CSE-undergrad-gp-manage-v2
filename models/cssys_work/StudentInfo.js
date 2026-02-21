module.exports = function(sequelize, DataTypes) {
    var StudentInfo = sequelize.define('StudentInfo', {
        credit11:{
            type: DataTypes.INTEGER,
            comment: '1학년 1학기 취득학점'
        },
        grade11:{
            type: DataTypes.FLOAT,
            comment: '1학년 1학기 학점평균'
        },
        credit12:{
            type: DataTypes.INTEGER,
            comment: '1학년 2학기 취득학점'
        },
        grade12:{
            type: DataTypes.FLOAT,
            comment: '1학년 2학기 학점평균'
        },
        credit21:{
            type: DataTypes.INTEGER,
            comment: '2학년 1학기 취득학점'
        },
        grade21:{
            type: DataTypes.FLOAT,
            comment: '2학년 1학기 학점평균'
        },
        credit22:{
            type: DataTypes.INTEGER,
            comment: '2학년 2학기 취득학점'
        },
        grade22:{
            type: DataTypes.FLOAT,
            comment: '2학년 2학기 학점평균'
        },
        credit31:{
            type: DataTypes.INTEGER,
            comment: '3학년 1학기 취득학점'
        },
        grade31:{
            type: DataTypes.FLOAT,
            comment: '3학년 1학기 학점평균'
        },
        credit32:{
            type: DataTypes.INTEGER,
            comment: '3학년 2학기 취득학점'
        },
        grade32:{
            type: DataTypes.FLOAT,
            comment: '3학년 2학기 학점평균'
        },
        field1:{
            type: DataTypes.STRING,
            comment: '선호하는 분야 1'
        },
        field2:{
            type: DataTypes.STRING,
            comment: '선호하는 분야 2'
        },
        field3:{
            type: DataTypes.STRING,
            comment: '선호하는 분야 3'
        },
        class1:{
            type: DataTypes.STRING,
            comment: '선호하는 교과목 1'
        },
        grade1:{
            type: DataTypes.STRING(2),
            comment: '선호하는 교과목 1 학점'
        },
        class2:{
            type: DataTypes.STRING,
            comment: '선호하는 교과목 2'
        },
        grade2:{
            type: DataTypes.STRING(2),
            comment: '선호하는 교과목 2 학점'
        },
        class3:{
            type: DataTypes.STRING,
            comment: '선호하는 교과목 3'
        },
        grade3:{
            type: DataTypes.STRING(2),
            comment: '선호하는 교과목 3 학점'
        },
        text:{
            type: DataTypes.STRING,
            comment: '수상/활동 실적'  
        },
        subject:{
            type: DataTypes.STRING,
            comment: '졸업 작품/논문 주제 (택1)'  
        },
        time: {
            type: DataTypes.DATE,
            allowNull: false
        },
        ip: {
            type: DataTypes.STRING(127),
            allowNull: false
        }
    }, {
        tableName: 'cssys_work_student_info',
        comment: '학생 신청서 정보',
        classMethods: {
            associate: function(models) {
                StudentInfo.belongsTo(models.User);
                StudentInfo.hasOne(models.Student);                
            }
        }
    });
    return StudentInfo;
};