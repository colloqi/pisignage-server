const sendSuccess = (res, msg, data) => {
    if (!res) return;

    const out = {};
    out.stat_message = msg;
    out.data = data;
    out.success = true;

    res.contentType("json");
    return res.json(out);
};

const sendError = (res, msg, err) => {
    if (!res) return;

    const out = {},
        errmsg = err ? err.toString() : "";
    out.stat_message = msg + errmsg;
    out.success = false;

    res.contentType("json");
    return res.json(out);
};

module.exports = {
    sendSuccess,
    sendError,
};
