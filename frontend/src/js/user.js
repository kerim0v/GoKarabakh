import { POST, GET } from "./server";

export class User {
  constructor(name, email, aboutMe, yearOfBirth, monthOfBirth, dayOfBirth, karabakhCoins, id) {
    this.name = name;
    this.email = email;
    this.aboutMe = aboutMe;
    this.yearOfBirth = yearOfBirth;
    this.monthOfBirth = monthOfBirth;
    this.dayOfBirth = dayOfBirth;
    this.karabakhCoins = karabakhCoins;
    this.id = id;
  }

  async getPlaces() {
    const req = await GET("/api/v1/places/get_saved", "id=" + this.id);
    if (req.status != 200) {
      console.debug("Status code of get places: " + req.status);
      alert("Failed to retrieve places.");
      return [];
    }
    const resp = await req.json();
    return resp;
  }

  async updatePlaces(pl) {
    if (pl === undefined || pl === null) {
      return true;
    }
    const body = {
        user_id: this.id,
        places: pl
    };

    console.log("BODY OBJECT =", body);
    console.log("SERIALIZED =", JSON.stringify(body));
    const res = await POST("/api/v1/places/update_saved", undefined, body);
    if (res.status != 200) {
      console.debug("Status code of update places: " + res.status);
      alert("Failed to update places.");
      return false;
    }
    return true;
  }

  static from(json) {
    return new User(
      json["name"],
      json["email"],
      json["about_me"],
      json["year_of_birth"],
      json["month_of_birth"],
      json["day_of_birth"],
      json["kx_count"],
      json["id"]);
  }

  static async fromId(id) {
    const result = await GET("/api/v1/users/get_id", "id=" + id);
    if (result.status != 200) {
      alert("We're sorry, we can't retrieve info about that user.");
      return null;
    }
    return this.from(await result.json());
  }

  static async getAll() {
    const users = await GET("/api/v1/users/get");
    if (users.status != 200) {
      alert("We're sorry, we can't find users.");
      return null;
    }
    const result = [];
    (await users.json()).forEach((x) => {
      result.push(this.from(x));
    });
    return result;
  }
}

export async function createUser(name, email, password) {
  const post = await POST("/api/v1/users/create", undefined, {
    "password": password,
    "email": email,
    "about_me": "", // initially unset
    "year_of_birth": 0, // initially unset
    "month_of_birth": 0, // initially unset
    "day_of_birth": 0, // initially unset
    "name": name,
    "kx_count": 100 // 100 karabakh coins
  });

  if (post.status != 200) {
    alert("Sorry, something went wrong. Please try again later.");
    return false;
  }

  const json = await post.json();

  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("loginID", json["id"]);
  console.debug("New user id: " + json["id"]);

  return true;
}

export async function userLogin(email, password) {
  // Security is definitely bad but for 50% this should do
  const get = await GET("/api/v1/auth/login", undefined, {
    email, password
  });

  if (get.status == 200) {
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("loginID", get["id"]);
    return await User.fromId(get["id"]);
  }

  return null;
}

export async function loadUser() {
  if (!haveAccount()) {
    return null;
  }

  const id = document.cookie.split('=')[1];
  const user = await User.fromId(id);
  return user;
}

export async function logOut() {
  if (!haveAccount()) {
    return;
  }

  localStorage.clear();
}

export function haveAccount() {
  return localStorage.getItem("isLoggedIn") === true;
}
