import mysql from "mysql2";
import express from 'express'
import cors from 'cors';
import { error } from "console";

const connection = mysql.createConnection({
  host: "sdlbk.h.filess.io",
  user: "bank_feedpigfar",
  database: "bank_feedpigfar",
  password: "1c41373872b021bbfa197f5a00038d00d9c11ed6",
  port: 3305
});

const app = express();
const PORT = 5000;


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());


const getAccount = (accountId) => {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM `accounts` where id = ?";
    connection.query(sql, [accountId], (err, res) => {
      if (err) return reject(err);
      resolve(res[0]); // Повертаємо результат
    });
  });
};

const changeAccountFunds = (funds, accountId) => {
  return new Promise((resolve, reject) => {
    const sql = "UPDATE `accounts` SET `funds` = ? WHERE `id` = ?";
    connection.query(sql, [funds, accountId], (err, res) => {
      if (err) return reject(err);
      resolve(true);
    });
  });
};

const accountIsExists = (accountId) => {
  const sql = "SELECT * FROM `accounts` where id = ?";
  connection.query(sql, [accountId], (err, res) => {
    if (err) console.log(err)
    if (res?.length === 0) return true
    return false
  })
}


app.post('/account', (req, res) => {
  const { name, id, balance } = req.body;
  if (balance < 0 || accountIsExists(id)) {
    res.status(400)
    return
  }

  const sql = "INSERT INTO `accounts` (`id`, `name`, `funds`) VALUES (?, ?, ?);"
  connection.query(sql, [id, name, balance], (err, response) => {
    if (err) {
      console.log(err)
      res.status(500)
      return
    }
    res.status(201).json({ message: "Account created successfully!" });
    return
  })
});

app.get('/account', (req, res) => {
  const accountId = req.query?.id;
  if (!accountId) {
    res.status(404).json({ message: "Account not found" })
  }

  const sql = "SELECT * FROM `accounts` WHERE `accounts`.`id` = ?";
  const sql2 = "SELECT * FROM `transactions` WHERE `transactions`.`from` = ? OR `transactions`.`to` = ? ORDER BY `id` DESC";
  connection.query(sql, [Number(accountId)], (err, response) => {
    if (err) {
      res.status(500)
      console.log(err)
      return
    }
    connection.query(sql2, [Number(accountId), Number(accountId)], (err, response2) => {
      if (err) {
        res.status(500)
        console.log(err)
        return
      }
      console.log(response2)
      res.status(200).json({
        ...response[0],
        transactions: [
          ...response2
        ]
      })
    })
  })
})

app.post('/addFunds', async (req, res) => {
  const { id, funds } = req.body;
  try {
    const acc = await getAccount(id);
    if (!acc) {
      return res.status(404).json({ message: "Account not found" });
    }

    const sql = "INSERT INTO `transactions` (`type`, `to`, `amount`) VALUES (?, ?, ?)";

    connection.query(sql, ['deposit', id, funds], async (err, response) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Error occurred while inserting transaction" });
      }
      await changeAccountFunds(acc.funds + funds, id);
      return res.status(200).json({ message: "Funds added successfully" });
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error occurred while updating account" });
  }
});

app.post('/withdraw', async (req, res) => {
  const { id, funds } = req.body;
  try {
    const acc = await getAccount(id);
    if (!acc || acc.funds <= funds) {
      return res.status(400).json({ message: "Insufficient funds or account not found" });
    }
    const sql = "INSERT INTO `transactions` (`type`, `from`, `amount`) VALUES (?, ?, ?)";

    connection.query(sql, ['withdraw', id, funds], async (err, response) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Error occurred while inserting transaction" });
      }
      await changeAccountFunds(acc.funds - funds, id);
      return res.status(200).json({ message: "Funds withdrawn successfully" });
    });
  }
  catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error occurred while updating account" });
  }
});

app.post('/transfer', async (req, res) => {
  const { id, transferId, funds } = req.body;
  try {

    const acc = await getAccount(id);
    if (acc && acc.funds <= funds) {
      return res.status(400).json({ message: "Insufficient funds or account not found" });
    }
    const sql = "INSERT INTO `transactions` (`type`, `from`, `to`, `amount`) VALUES (?, ?, ?, ?)";

    connection.query(sql, ['transfer', id, transferId, funds], async (err, response) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Error occurred while inserting transaction" });
      }

      const transferedAcc = await getAccount(transferId)
      if (!transferedAcc) return res.status(404).json({ message: "Transfered account not found" })

      await changeAccountFunds(acc.funds - funds, id);
      await changeAccountFunds(transferedAcc.funds + funds, transferId);

      return res.status(200).json({ message: "Funds transfered successfully" });
    });
  }
  catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error occurred while updating account" });
  }
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
