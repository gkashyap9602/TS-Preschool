// import mongoose from "mongoose"
import express, { Response, Request, NextFunction } from "express";
import { AdminModels } from "../../models/index";
import { userInterface } from "../../models/adminModel/ModelNewUser";
import { MESSAGES } from "../../utils/message";
import bcrypt from "bcrypt";
import http from "http-status-codes";
import Services from "../../services/index"
import { genAuthToken, random_Otpfun, verify_refresh_token } from "../../utils/auth";
import crypto from "crypto"
import mongoose from "mongoose"

import {
	error_Object,
	resp_Object,
	responseType,
	Ilogin,
} from "../../utils/helperFun";
import {
	Controller,
	Route,
	Get,
	Post,
	Put,
	Delete,
	Query,
	Path,
	Tags,
	Body,
	Security,
	Example,
} from "tsoa";
import { put } from "../routes/userRoutes";
import { isAwaitExpression } from "typescript";

let refreshTokens: any = [];

@Tags("Admin")
@Route("/admin")
export class AdminController extends Controller {
	req: Request;
	res: Response;
	userId: string;
	userRole: number;
	constructor(req: Request, res: Response) {
		super();
		this.req = req;
		this.res = res;
		this.userId = req.body.user ? req.body.user._id : "";
		this.userRole = req.body.user ? req.body.user.role : null;
	};
	public async generateTransId(): Promise<responseType | any> {
		const id = crypto.randomBytes(16).toString("hex");
		return id;
	}
	@Post("/user/create")
	public async New_Users(@Body() request: { role: number; fname: string; lname: string; email: string; mobileNum: number; parentMobNum: number; password: string; father_name: string; mother_name: string; }): Promise<responseType | any> {
		try {
			const salt = await bcrypt.genSalt(10);
			const body = request;
			console.log(body, "body");

			if (!body) throw new error_Object("body is empty", 400)
			//  logic part of autogenerated username
			const today = new Date();
			const year = today.getFullYear().toString();
			const yearcode = parseInt(year.slice(-2));
			const usercount = await AdminModels.ModelNewUser.find({
				role: 3,
			}).count();
			const count: any = (usercount + 1).toString();
			const usercode = count.padStart(2, 0);
			// check if user alreday exist or not
			const finduser = await AdminModels.ModelNewUser.findOne({
				email: body.email,
			});
			console.log(finduser);
			if (finduser)
				throw new error_Object(
					MESSAGES.USER_ALREADY_REGISTERED,
					http.UNPROCESSABLE_ENTITY
				);
			body.password = await bcrypt.hash(body.password, salt);
			// // const student_img = req.file.path;
			// // Student_Data.student_img = student_img;

			// assigning a auto generated username to the user
			Object.assign(body, { username: "PS" + yearcode + usercode });

			const UserSaved: any = await new AdminModels.ModelNewUser(body).save()
			console.log(UserSaved, "Usersavedddd");

			if (!UserSaved) throw new error_Object("user not registered", 404)
			// save(async (err, success) => {

			// 	if (err) throw err
			// 	const mail = await Services.mailer(body.email, "Successfull Registration", `Hello ${success.fname + " " + success.lname} You are Registered Successfully`)
			// 	// console.log(mail,"maill controller side");
			// 	// if(mail.mailError) throw mail.mailError

			// });
			const mail = await Services.mailer(body.email, "Successfull Registration", `Hello ${UserSaved.fname + " " + UserSaved.lname} You are Registered Successfully`)

			return new resp_Object(
				MESSAGES.USER_REGISTERED_SUCCESSFULLY,
				http.CREATED,
				UserSaved
			);
		} catch (error: any) {
			return { CatchError: error };
		}
	};

	@Post("/login")
	public async AdminLoginFun(
		@Body() request: { password: string; email: string }
	): Promise<responseType | any> {
		try {
			console.log(request, "request");

			const { email, password } = request;
			console.log(email, password, "email passs");
			// find if user exist or not
			const Userdata = await AdminModels.ModelNewUser.findOne({ email: email });
			if (!Userdata)
				throw new error_Object(MESSAGES.USER_NOT_VALID, http.UNAUTHORIZED);
			const user_id = Userdata._id;

			if (await bcrypt.compare(password, Userdata.password)) {

				if (Userdata.role === 1) {
					//generating jwt token
					const token = genAuthToken(user_id);
					if (!token)
						throw new error_Object(MESSAGES.TOKEN_NOT_GENERATED, http.NOT_FOUND);
					//   console.log(token, "token login side");
					refreshTokens.push(token.refresh_token);

					return new resp_Object(MESSAGES.LOGIN_SUCCESSFULLY, http.ACCEPTED, {
						AccessToken: token.Access_token,
						RefreshToken: token.refresh_token,
					});
				} else {
					throw new error_Object(
						MESSAGES.YOU_ARE_NOT_ADMIN,
						http.UNAUTHORIZED
					);
				}

			} else {
				throw new error_Object(
					MESSAGES.PASSWORD_NOT_MATCHED,
					http.UNAUTHORIZED
				);
			}
		} catch (error) {
			return { CatchError: error };
		}
	};


	//--------------------refresh token-----------------------------
	@Security('Bearer')
	@Post('/login/refreshtoken')
	public async renew_token(@Body() request: { refresh_token: string }): Promise<responseType | any> {
		try {
			const { refresh_token } = request
			if (!refresh_token) throw new error_Object("please enter  data", 404)
			console.log(refresh_token, "controller side");

			if (refresh_token || refreshTokens.includes(refresh_token)) {
				const verify: any = await verify_refresh_token(refresh_token)
				// const verify: any =  jwt.verify(refresh_token, refresh_token_SecretKey)
				if (verify.verify_err) {
					console.log(verify.verify_err, "verify_err sideeeeeeeeeeee");
					throw verify.verify_err
				}
				// new error_Object("invalid token please check", 422)
				console.log(verify, "verifyyyy");
				const New_Access_token = genAuthToken(verify._id);
				if (New_Access_token) {
					return new resp_Object(MESSAGES.TOKEN_GENERATED_SUCCESSFULLY, http.CREATED, { NewAccesstoken: New_Access_token.Access_token })
				}
			}
		} catch (error) {
			console.log(error, "catch side err");

			return { CatchError: error }

		}
	};

	@Security("Bearer")
	@Put("/user/update/:id")
	public async Update_userfun(@Body() request: { role: number; fname: string; lname: string; email: string; mobileNum: number; parentMobNum: number; password: string; father_name: string; mother_name: string }, id: string): Promise<responseType | any> {
		try {
			const user_id = id;
			console.log(user_id, "idd");

			const body = request;
			console.log(body, "body or request");

			if (!body)
				throw new error_Object(
					"Something Not Right Data Not Recieved Please Enter Data",
					http.EXPECTATION_FAILED
				);

			const find = await AdminModels.ModelNewUser.findOne({ _id: user_id });
			if (!find)
				throw new error_Object(
					MESSAGES.DOES_NOT_EXIST,
					http.EXPECTATION_FAILED
				);

			const UserUpdated = await AdminModels.ModelNewUser.findByIdAndUpdate(
				user_id,
				body,
				{ new: true }
			);

			return new resp_Object(MESSAGES.UPDATED_SUCCESSFULLY, http.CREATED);
		} catch (error) {
			return { CatchError: error };
		}
	}
	@Security("Bearer")
	@Delete("/user/delete/:id")
	public async Delete_Userfun(id: string): Promise<responseType | any> {
		try {
			const user_id = id;
			console.log(user_id);
			const find = await AdminModels.ModelNewUser.findOne({ _id: user_id });
			if (!find)
				throw new error_Object(
					MESSAGES.DOES_NOT_EXIST,
					http.EXPECTATION_FAILED
				);

			const deleted = await AdminModels.ModelNewUser.findByIdAndDelete(user_id);
			console.log(deleted, "deleted");
			return new resp_Object(MESSAGES.DELETED_SUCCESSFULLY, http.ACCEPTED);
		} catch (error) {
			return { CatchError: error };
		}
	};
	@Security("Bearer")
	@Get("/users")
	public async User_detailsfun(): Promise<responseType | any> {
		try {
			console.log(this.userId, "userid token ");
			const users_details = await AdminModels.ModelNewUser.find(
				{ role: 3 },
				"father_name mobileNum fname gender"
			);

			return new resp_Object(
				MESSAGES.DATA_RETREIVE_SUCCESSFULLY,
				http.OK,
				users_details
			);
		} catch (error) {
			return { CatchError: error };
		}
	};

	@Get("/users/:id")
	public async SingleUserDetails(id: string) {
		try {
			const user_id = id
			const userdata = await AdminModels.ModelNewUser.find(
				{ _id: user_id },
				{ password: 0 }
			);
			const response = new resp_Object(
				MESSAGES.DATA_RETREIVE_SUCCESSFULLY,
				http.OK,
				userdata
			);
			return { CatchResponse: response };
		} catch (error) {
			return { CatchError: error };
		}
	};
	//--------------class functions-------------------------------
	@Security("Bearer")
	@Post("/class/create")
	public async addCourse(@Body() request: { Class: string; Class_Code: string; Admission_Fee: number; Monthly_Fee: number; }): Promise<responseType | any> {
		try {

			let ClassData = request;
			if (!ClassData) throw new error_Object("please enter data", 404)

			// const FindClass = await AdminModels.ModelNewCource.find({ $or:[{Class: ClassData.Class},{ Class_Code:ClassData.Class_Code}]});
			const FindClass = await AdminModels.ModelNewCource.findOne({
				Class: ClassData.Class,
			});
			const FindClassCode = await AdminModels.ModelNewCource.findOne({
				Class_Code: ClassData.Class_Code,

			});
			console.log(FindClass, "findclass");

			if (FindClass) {
				throw new error_Object("Class  Already Register", 409)

			}
			if (FindClassCode) {
				throw new error_Object(" Class Code Already Register", 409)

			}
			await new AdminModels.ModelNewCource(ClassData).save();
			return new resp_Object(MESSAGES.CLASS_REGISTERED_SUCCESSFULLY, http.CREATED)

			// if (FindClass.length === 1){
			// 	throw new error_Object("Class Already Registered", http.CONFLICT)

			// }else if (FindClass.length > 1){
			// 	throw new error_Object("Class Code Already Registered", http.CONFLICT)

			// }else{
			// 	 await new AdminModels.ModelNewCource(ClassData).save();
			// 	 return new resp_Object(MESSAGES.CLASS_REGISTERED_SUCCESSFULLY, http.CREATED)
			// }
		} catch (error) {
			return { CatchError: error };
		}
	};

	@Security("Bearer")
	@Put("class/update/:id")
	public async updateClass(@Body() request: { Class: number; Admission_Fee: number; Class_Code: string; Monthly_Fee: number; }, id: string): Promise<responseType | any> {
		try {
			const updates = request;
			const options = { new: true };
			const result = await AdminModels.ModelNewCource.findByIdAndUpdate(id, updates, options);
			if (!result) throw new error_Object(MESSAGES.DOES_NOT_EXIST, http.NOT_FOUND);

			return new resp_Object(MESSAGES.CLASS_UPDATED_SUCCESSFULLY, http.NO_CONTENT, result);
		} catch (error) {
			return { CatchError: error };
		}
	};

	@Security('Bearer')
	@Delete('/class/delete/:id')
	public async deleteClass(id: string): Promise<responseType | any> {
		try {
			const data = await AdminModels.ModelNewCource.deleteOne({ _id: id });
			console.log(data, "data..");
			if (!data) throw new error_Object(MESSAGES.DOES_NOT_EXIST, http.BAD_REQUEST);
			return new resp_Object(MESSAGES.DELETED_SUCCESSFULLY, http.NO_CONTENT);
		} catch (error) {
			return { CatchError: error };
		}
	};

	@Security('Bearer')
	@Get('/classes')
	public async get_classes(): Promise<responseType | any> {
		try {
			const get_classes = await AdminModels.ModelNewCource.find({}, { addmission_fee: 0, monthly_fee: 0 });

			return new resp_Object(MESSAGES.DATA_RETREIVE_SUCCESSFULLY, http.OK, get_classes)

		} catch (error) {
			return { CatchError: error }
		}
	};
	//---------------------------student functions ------------------------------//
	@Security('Bearer')
	@Post('/student/create')
	public async Add_Student(@Body() request: { userId: string, classId: string, IsActive: Boolean }): Promise<responseType | any> {
		try {
			const body = request
			const FindClass = await AdminModels.ModelNewCource.findById({ _id: body.classId });
			//  console.log(className);
			if (!FindClass) throw new error_Object(MESSAGES.INVALID_ID_OR_DATA_DOES_NOT_EXIST, http.NOT_FOUND)
			const ClassName = parseInt(FindClass.Class);

			const finduser = await AdminModels.ModelNewStudent.find({
				userId: body.userId,
				classId: body.classId,
			});
			console.log(finduser, "find userrrrrrr");
			if (finduser.length > 0) {
				console.log("already");
				throw new error_Object(MESSAGES.STUDENT_ALREADY_REGISTERED_WITH_SAME_CLASS, http.CONFLICT)
			} else {
				const ClassCount = await AdminModels.ModelNewStudent.find({
					class_id: body.classId,
				}).count();
				// console.log(countt,"same class count");

				Object.assign(body, { roll_num: ClassName * 1000 + 1 + ClassCount });
				const Store_Student = await new AdminModels.ModelNewStudent(body).save();
				return new resp_Object(MESSAGES.STUDENT_REGISTERED_SUCCESSFULLY, http.CREATED, Store_Student)

			}
		} catch (error) {
			return { CatchError: error }

		}
	};

	@Security('Bearer')
	@Put('/student/update/:id')
	public async updateStudent(@Body() request: { class_id: string; user_id: string; }, id: string): Promise<responseType | any> {
		try {
			const updates = request;
			const result = await AdminModels.ModelNewStudent.findByIdAndUpdate(id, updates, { new: true });
			if (!result) throw new error_Object(MESSAGES.INVALID_ID_OR_DATA_DOES_NOT_EXIST, http.NOT_FOUND);

			return new resp_Object(MESSAGES.STUDENT_UPDATED_SUCCESSFULLY, http.NO_CONTENT, result);
		} catch (error) {
			return { CatchError: error }

		}
	};

	@Security('Bearer')
	@Delete('/student/delete/:id')
	public async deleteStudent(id: string): Promise<responseType | any> {
		try {

			const UserDeleted = await AdminModels.ModelNewStudent.findByIdAndUpdate(id, { IsActive: false }, { new: true });
			// const data = await AdminModels.ModelNewStudent.deleteOne({ _id: id });
			if (!UserDeleted) throw new error_Object(MESSAGES.INVALID_ID_OR_DATA_DOES_NOT_EXIST, http.NOT_FOUND);
			return new resp_Object(MESSAGES.STUDENT_DELETED_SUCCESSFULLY, http.NO_CONTENT);
		} catch (error) {
			return { CatchError: error }

		}
	};

	@Security('Bearer')
	@Get('/students')
	public async get_Students(@Query() page: number | any, @Query() size: number | any): Promise<responseType | any> {
		try {
			//   let { page, size } 
			if (!page) {
				page = 1;
			}
			if (!size) {
				size = 2;
			}
			const limit = parseInt(size);
			const skip = (page - 1) * size;
			const fetchdata = await AdminModels.ModelNewStudent.find({ IsActive: true })
				.limit(limit)
				.skip(skip)
				.sort({ updatedAt: -1 });
			return new resp_Object("Student Data", 200, fetchdata);
		} catch (error) {
			return { CatchError: error }

		}
	}
	// -----------------------transactions routes---------------------------------
	@Security('Bearer')
	@Post('/transaction/create')
	public async transactionHistory(
		@Body() request: { feeType: number; feeAmount: number; studentId: string, classId: string }): Promise<responseType | any> {
		try {

			const { studentId, classId } = request
			if (!studentId) {
				throw new error_Object("Pease enter valid student id", 400);
			} else {
				if (!classId) {
					throw new error_Object("Please enter valid class id", 400);
				} else {
					const studentdata: object | any = await AdminModels.ModelNewStudent.findOne({
						_id: studentId,
					});
					if (!studentdata) {
						throw new error_Object("Data not found", 403);
					} else {
						const obj = {
							studentId: studentId,
							classId: classId,
							feeType: request.feeType,
							feeAmount: request.feeAmount,
							transactionId: await this.generateTransId(),
						};

						const classdata: object | any = await AdminModels.ModelNewCource.findOne({
							_id: classId,
						});
						const myfee = classdata.Admission_Fee;
						// const data1 = studentdata.Firstname;
						await new AdminModels.ModelTransaction(obj).save();
						if (obj.feeType == 1) {
							const rest = classdata.Admission_Fee - obj.feeAmount;
							const myobj = await AdminModels.ModelNewStudent.findByIdAndUpdate(studentId, {
								total_due_fee: rest,
							});
							return new resp_Object("Admission Fee Paid Successfully", 200);
						} else if (obj.feeType == 2) {
							const rest = classdata.Monthly_Fee - obj.feeAmount;
							const sum = studentdata.total_due_fee + rest;
							const myobj = await AdminModels.ModelNewStudent.findByIdAndUpdate(studentId, {
								total_due_fee: sum,
							});
							return new resp_Object("Monthly Fee Paid Successfully", 200);
						} else if (obj.feeType == 3) {
							const rest = obj.feeAmount;
							const sum = studentdata.total_due_fee - obj.feeAmount;
							await AdminModels.ModelNewStudent.findByIdAndUpdate(studentId, {
								total_due_fee: sum,
							});

							return new resp_Object("Dues Paid Successfully", 200);
						}
						const mydue: object | any = await AdminModels.ModelNewStudent.findById(studentId);
						if (mydue.total_due_fee <= 0) {
							await AdminModels.ModelNewStudent.findByIdAndUpdate(studentId, {
								pendingFee: true,
							});
						} else {
							await AdminModels.ModelNewStudent.findByIdAndUpdate(studentId, {
								pendingFee: false,
							});
						}
					}
				}
			}
		} catch (error) {
			return { CatchError: error }

		}
	};

	// =============Get All Transactions===============
	@Security('Bearer')
	@Get('/transaction')
	public async getAllTransaction(@Query() page: number | any, @Query() size: number | any): Promise<responseType | any> {
		try {
			//   let { page, size } = request;
			if (!page) {
				page = 1;
			}
			if (!size) {
				size = 5;
			}
			const limit = parseInt(size);
			const skip = (page - 1) * size;
			const trdata = await AdminModels.ModelTransaction.find(
				{},
				{ feeType: 1, feeAmount: 1, transactionId: 1, createdAt: 1 }
			)
				.limit(limit)
				.skip(skip)
				.sort({ updatedAt: -1 });
			return new resp_Object("Transactions", 200, trdata);
		} catch (error) {
			return { CatchError: error }

		}
	};
	// =========================filter by date=========================
	@Security('Bearer')
	@Get('/transaction/bydate')
	public async transactionsByDate(@Query() startDate: Date | any, @Query() endDate: Date | any): Promise<responseType | any> {
		try {
			if (!startDate) {
				throw new error_Object("Please enter start date", 400);
			} else {
				if (!endDate) {
					throw new error_Object("Please enter end date", 400);
				} else {
					const newendDate = new Date(endDate);
					newendDate.setDate(newendDate.getDate() + 1);
					if (!newendDate) {
						throw new error_Object("Please enter a valid date", 400);
					} else {
						const result = await AdminModels.ModelTransaction.find({
							createdAt: { $gte: startDate, $lte: newendDate },
						}).sort({ updatedAt: -1 });
						if (result.length == 0) {
							throw new error_Object("No result found", 404);
						} else {
							return new resp_Object("Filtered Data by Date", 200, result);
						}
					}
				}
			}
		} catch (error) {
			return { CatchError: error }

		}
	};
	// =================filter by class=====================
	@Security('Bearer')
	@Get("/transaction/byclass/:id")
	public async transactionByClass(id: string): Promise<responseType | any> {
		try {
			const class_id = id;

			console.log(class_id);
			const transactions = await AdminModels.ModelTransaction.find({ classId: class_id });
			console.log(transactions);
			if (transactions.length === 0) throw MESSAGES.NO_MORE_ENTRIES_ARE_AVAILABLE;
			const transacLength = transactions.length
			return new resp_Object(MESSAGES.DATA_RETREIVE_SUCCESSFULLY, http.OK, { transacLength, transactions })
		} catch (error) {
			return { CatchError: error }

		}
	};
	// =====================filter by name====================
	// @Security('Bearer')
	// @Get("/transaction/byname/:firstname")
	// public async transactionByName(firstname: string): Promise<responseType | any> {
	// 	try {
	// 		if (!firstname) {
	// 			throw new error_Object("Please enter a name", 400);
	// 		} else {
	// 			const databyname = await AdminModels.ModelTransaction.find({
	// 				fname: firstname,
	// 			});
	// 			if (databyname.length == 0) {
	// 				throw new error_Object("No records found", 403);
	// 			} else {
	// 				return new resp_Object("Filter Data by Name", 200, databyname);
	// 			}
	// 		}
	// 	} catch (error) {
	// 		return { CatchError: error }

	// 	}
	// };

	@Security('Bearer')
	@Get("/transaction/pastdays")
	public async transactionOfLastDays(@Query() total_days: any): Promise<responseType | any> {
		try {

			if (total_days == 0) throw MESSAGES.PLEASE_ENTER_VALID_NUMBER_OF_DAY;
			console.log(typeof total_days);
			let date = new Date();
			date.setDate(date.getDate() - total_days);
			console.log(date);
			const transactions = await AdminModels.ModelTransaction.find({
				updatedAt: { $lte: new Date(), $gte: date },
			});
			if (transactions.length === 0)
				throw MESSAGES.NO_MORE_ENTRIES_ARE_AVAILABLE;

			const transacLength = transactions.length

			return new resp_Object(MESSAGES.DATA_RETREIVE_SUCCESSFULLY, http.OK, { transacLength, transactions });

		} catch (error) {
			return { CatchError: error }

		}
	};

	@Security('Bearer')
	@Get("/transaction/totalfee")
	public async totalFeeOfLastDays(@Query() class_id?: any, @Query() from_date?: any, @Query() to_date?: any): Promise<responseType | any> {
		try {
			//  if(!request) throw new error_Object("please enter data",400)
			const startDate = new Date(from_date);
			const endDate = new Date(to_date);

			// endDate.setDate(endDate.getDate() + 1);
			// console.log(startDate, "startdate");

			// console.log(class_id);
			var match_Condition: any;
			var Total = [];

			for (let index = 1; index <= 4; index++) {
				let date = new Date();

				if (index === 1) {
					date.setDate(date.getDate() - 7);
					// console.log(date, "date when index 1");
				} else if (index === 2) {
					date.setDate(date.getDate() - 30);
					// console.log(date, "date when index 2");
				} else if (index === 3) {
					date.setHours(0, 0, 0);
					// console.log(date.toString(), "tdate when index 3");
				} else if (index === 4) {
					const data: any = await AdminModels.ModelTransaction.findOne();
					date = new Date(data.createdAt);
					// console.log(data.createdAt, "created index 4");
				}

				if (!class_id && !from_date && !to_date) {
					console.log("if");
					match_Condition = { updatedAt: { $gte: date } }
				} else if (class_id && !from_date && !to_date) {
					console.log("else if 1");
					match_Condition = {
						updatedAt: { $gte: date },
						classId: new mongoose.Types.ObjectId(class_id),
					};
				} else if (class_id && from_date && to_date) {
					console.log("else if 2");
					match_Condition = {
						updatedAt: { $gte: startDate, $lte: endDate },
						classId: new mongoose.Types.ObjectId(class_id),
					};
				} else if (!class_id && from_date && to_date) {
					throw "Please Enter Class Id with Session (from and to date)"
				}
				console.log(match_Condition, "match")
				var result = await AdminModels.ModelTransaction.aggregate([

					{ $match: match_Condition },
					{
						$group: {
							_id: null,
							total: {
								$sum: "$feeAmount",
							},
						},
					},
					{
						$project: {
							_id: 0,
							total: 1,
						},
					},
				]);

				if (result.length === 0) {
					result.push(0);
				}
				Total.push(result);
			}
			console.log(match_Condition, "match")

			let PastDaysTotal = {
				Today: Total[2],
				Last7Days: Total[0],
				Last30Days: Total[1],
				GrandTotal: Total[3],
			};
			// console.log(result, "result");
			console.log(Total, "total ar");

			return new resp_Object(MESSAGES.DATA_RETREIVE_SUCCESSFULLY, http.OK, PastDaysTotal);

		} catch (error) {
			console.log(error);
			return { CatchError: error }

		}
	}
};
