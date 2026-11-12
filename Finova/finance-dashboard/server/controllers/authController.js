const bcrypt=require('bcryptjs');
const pool=require('../config/db');
const generateToken=require('../utils/generateToken');

// ---------- REGISTER ----------
const register=async (req,res)=>{
    try{
        const{name,email,password}=req.body;

        // 1. Validation
        if(!name || !email || !password){
            return res.status(400).json({
                message:'Name,email aur Password required hai'
            });
        }
        if (password.length < 6) {
      return res.status(400).json({ message: 'Password kam se kam 6 characters ka hona chahiye' });
    }
     
     const cleanEmail = email.trim().toLowerCase();

      // 2. Check: email pehle se exist karta hai?
     const existing=await pool.query('SELECT id From users WHERE email=$1',[cleanEmail]);
     if(existing.rows.length>0){
        return res.status(409).json({
            message:'Ye email already registered hai'
        });
     }

     // 3. Password hash karo
     const salt=await bcrypt.genSalt(10);
     const passwordHash=await bcrypt.hash(password,salt);

     // 4. User DB mein save karo (role hamesha 'customer')
     const result=await pool.query(
        `INSERT INTO users (name,email,password_hash)
        VALUES($1,$2,$3)
        RETURNING id, name ,email, role, created_at`,
        [name.trim(),cleanEmail,passwordHash]
     );

     const user=result.rows[0];

     // 5. Token banao aur response bhejo
     res.status(201).json({
        user,
        token:generateToken(user)
     });


    }
    catch(err){
        console.log(err);
        res.status(500).json({message:'Server error'});
    }
}

// ---------- LOGIN ----------
const login=async (req,res)=>{
    try{
        const {email,password}=req.body;

        if(!email || !password){
            return res.status(400).json({
                message:'Email aur password required hai'
            });
        }
         // 1. User dhundo
         const result=await pool.query(
            `SELECT * FROM users WHERE email=$1`,
            [email.trim().toLowerCase()]
         );
         const user=result.rows[0];

         // 2. User nahi mila ya password galat: same message do
         if(!user || !(await bcrypt.compare(password,user.password_hash))){
            return res.status(401).json({
                message:'Email password galat hai'
            });
         }

         // 3. Password hash response se hata do
         delete user.password_hash;

         res.json({user,token:generateToken(user)});
    }
    catch(err){
        console.log(err);
        res.status(500).json({
            message:'Server Error'
        })
    }
}

// ---------- ME (logged-in user ki info) ----------
const getMe = async (req, res) => {
  res.json({ user: req.user });
};

module.exports={register,login,getMe};