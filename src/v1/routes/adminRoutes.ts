import express, { Request, Response, NextFunction } from "express";
const router = express.Router();

import { AdminController } from "../controller/adminController"
import { verify_token } from "../../utils/auth"
import { response_handler, object_id_check } from "../../utils/helperFun"

router.post('/user/create', verify_token, async (req: Request, res: Response, next: NextFunction) => {
    const controller = new AdminController(req, res)
    if (!req.body) {
        res.status(400).send({ message: "body is emptyy", status_code: 400 })
    }
    const response = await controller.New_Users(req.body)
    console.log(response, "response");
    response.CatchError ? next(response.CatchError) : response_handler(response, res)

});

router.put('/user/update/:id', verify_token, async (req: Request, res: Response, next: NextFunction) => {
    const controller = new AdminController(req, res)
    object_id_check(req.params.id, res);
    const response = await controller.Update_userfun(req.body, req.params.id)
    console.log(response, "response");
    response.CatchError ? next(response.CatchError) : response_handler(response, res)

})
router.delete('/user/delete/:id', verify_token, async (req: Request, res: Response, next: NextFunction) => {
    const controller = new AdminController(req, res)
    object_id_check(req.params.id, res);
    const response = await controller.Delete_Userfun(req.params.id)
    console.log(response, "response");
    response.CatchError ? next(response.CatchError) : response_handler(response, res)

})

router.get('/users', verify_token, async (req: Request, res: Response, next: NextFunction) => {
    const controller = new AdminController(req, res)
    const response = await controller.User_detailsfun()
    console.log(response, "response");
    response.CatchError ? next(response.CatchError) : response_handler(response, res)

});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    const controller = new AdminController(req, res)
    console.log(req.body, "admin route side");
    const response = await controller.AdminLoginFun(req.body)
    response.CatchError ? next(response.CatchError) : response_handler(response, res)

});
router.post('/login/refreshtoken', async (req: Request, res: Response, next: NextFunction) => {
    const controller = new AdminController(req, res)
    console.log(req.body, "admin route side");
    const response = await controller.renew_token(req.body)
    response.CatchError ? next(response.CatchError) : response_handler(response, res)

});
router.get('/users/:id', verify_token, async (req: Request, res: Response, next: NextFunction) => {
    const controller = new AdminController(req, res)
    object_id_check(req.params.id, res);
    console.log(req.body, "admin route side");
    const response = await controller.SingleUserDetails(req.params.id)
    response.CatchError ? next(response.CatchError) : response_handler(response, res)

});

//--------------------------class routes------------------------------

router.post('/class/create', verify_token, async (req: Request, res: Response, next: NextFunction) => {
    const controller = new AdminController(req, res)
    console.log(req.body, "admin route side");
    const response = await controller.addCourse(req.body)
    response.CatchError ? next(response.CatchError) : response_handler(response, res)

});
router.put('/class/update/:id', verify_token, async (req: Request, res: Response, next: NextFunction) => {
    const controller = new AdminController(req, res)
    object_id_check(req.params.id, res);
    console.log(req.body, req.params.id, "admin route side");
    const response = await controller.updateClass(req.body, req.params.id)
    response.CatchError ? next(response.CatchError) : response_handler(response, res)

});
router.delete('/class/delete/:id', verify_token, async (req: Request, res: Response, next: NextFunction) => {
    const controller = new AdminController(req, res)
    object_id_check(req.params.id, res);
    console.log(req.params.id, "admin route side");
    const response = await controller.deleteClass(req.params.id)
    response.CatchError ? next(response.CatchError) : response_handler(response, res)

});
router.get('/classes', verify_token, async (req: Request, res: Response, next: NextFunction) => {
    const controller = new AdminController(req, res)
    const response = await controller.get_classes()
    response.CatchError ? next(response.CatchError) : response_handler(response, res)

});
//-------------------student routes-----------------------------
router.post('/student/create', verify_token, async (req: Request, res: Response, next: NextFunction) => {
    const controller = new AdminController(req, res)
    const response = await controller.Add_Student(req.body)
    response.CatchError ? next(response.CatchError) : response_handler(response, res)

});
router.put('/student/update/:id', verify_token, async (req: Request, res: Response, next: NextFunction) => {
    const controller = new AdminController(req, res)
    object_id_check(req.params.id, res);
    const response = await controller.updateStudent(req.body, req.params.id)
    response.CatchError ? next(response.CatchError) : response_handler(response, res)

});
router.delete('/student/delete/:id', verify_token, async (req: Request, res: Response, next: NextFunction) => {
    const controller = new AdminController(req, res)
    object_id_check(req.params.id, res);
    console.log(req.params.id, "admin route side");
    const response = await controller.deleteStudent(req.params.id)
    response.CatchError ? next(response.CatchError) : response_handler(response, res)

});
router.get('/students', async (req: Request, res: Response, next: NextFunction) => {
    const controller = new AdminController(req, res)
    const { page, size } = req.query
    const response = await controller.get_Students(page, size)
    response.CatchError ? next(response.CatchError) : response_handler(response, res)

});

//----------------------transactions routes--------------------------------------
router.post('/transaction/create', async (req: Request, res: Response, next: NextFunction) => {
    const controller = new AdminController(req, res)
    const response = await controller.transactionHistory(req.body,)
    response.CatchError ? next(response.CatchError) : response_handler(response, res)

});
router.get('/transaction', async (req: Request, res: Response, next: NextFunction) => {
    const controller = new AdminController(req, res)
    const { page, size } = req.query
    const response = await controller.getAllTransaction(page, size)
    response.CatchError ? next(response.CatchError) : response_handler(response, res)

});
router.get('/transaction/bydate', async (req: Request, res: Response, next: NextFunction) => {
    const controller = new AdminController(req, res)
    const { startDate, endDate } = req.query
    const response = await controller.transactionsByDate(startDate, endDate)
    response.CatchError ? next(response.CatchError) : response_handler(response, res)

});
router.get('/transaction/byclass/:id', async (req: Request, res: Response, next: NextFunction) => {
    const controller = new AdminController(req, res)
    object_id_check(req.params.id, res);
    const response = await controller.transactionByClass(req.params.id)
    response.CatchError ? next(response.CatchError) : response_handler(response, res)

});
// router.get('/transaction/byname/:firstname', async (req: Request, res: Response, next: NextFunction) => {
//     const controller = new AdminController(req, res)
//     const response = await controller.transactionByName(req.params.id)
//     response.CatchError ? next(response.CatchError) : response_handler(response, res)

// });
router.get('/transaction/pastdays', async (req: Request, res: Response, next: NextFunction) => {
    const controller = new AdminController(req, res)
    // const total_days = req.query.days;
    const response = await controller.transactionOfLastDays(req.query.days)
    response.CatchError ? next(response.CatchError) : response_handler(response, res)

});
router.get('/transaction/totalfee', async (req: Request, res: Response, next: NextFunction) => {
    const controller = new AdminController(req, res)
    // const class_id = req.query.class_id;
    // const from_date = req.query.from_date;
    // const to_date = req.query.to_date;
    const { class_id, from_date, to_date } = req.query

    const response = await controller.totalFeeOfLastDays(class_id, from_date, to_date)
    response.CatchError ? next(response.CatchError) : response_handler(response, res)

});

export = router;
