import vCard from "vcf";

import {
  getPhoneNumbersFromVCard,
  comparePhoneNumbers,
  matchWhatsAppProfilesWithVCards,
} from "./helpers";

describe("getPhoneNumbersFromVCard", () => {
  it("returns a phone number in an array from a vcard", () => {
    const cardContent = `BEGIN:VCARD\r
VERSION:3.0\r
FN:Single Number\r
N:Number;Single;;;\r
TEL;TYPE=CELL:+49 123 4567890\r
END:VCARD\r
`;
    const card = new vCard().parse(cardContent);
    expect(getPhoneNumbersFromVCard(card)).toEqual(["+491234567890"]);
  });

  it("returns multiple phone numbers from a vcard", () => {
    const cardContent = `BEGIN:VCARD\r
VERSION:3.0\r
FN:Multiple Numbers\r
N:Numbers;Multiple;;;\r
EMAIL;TYPE=WORK:myemail@example.com\r
TEL;TYPE=CELL:+49 1234 123456\r
TEL;TYPE=CELL:0172 8022360\r
UID:3eb9c209-8ba8-4b2b-b475-537c69d5d8ac\r
END:VCARD\r
`;
    const card = new vCard().parse(cardContent);
    expect(getPhoneNumbersFromVCard(card)).toEqual([
      "+491234123456",
      "01728022360",
    ]);
  });

  it("returns an empty array when the vcard doesn't have a phone number", () => {
    const cardContent = `BEGIN:VCARD\r
VERSION:3.0\r
FN:No Number\r
N:Number;No;;;\r
UID:3eb9d202-8ba8-4b1a-b475-537d69d5d8ac\r
END:VCARD\r
`;
    const card = new vCard().parse(cardContent);
    expect(getPhoneNumbersFromVCard(card)).toEqual([]);
  });
});

describe("comparePhoneNumbers", () => {
  it.each([
    [
      "returns true when the numbers match exactly",
      true,
      "4912345678",
      "+4912345678",
    ],
    [
      "returns true when the card number has a leading 00 but they otherwise match",
      true,
      "4912345678",
      "004912345678",
    ],
    [
      "returns true when the card number has a leading zero but matches the whatsapp number otherwise",
      true,
      "4912345678",
      "012345678",
    ],
    [
      "returns false when the numbers don't match",
      false,
      "4912345678",
      "012345478",
    ],
    ["can handle foreign numbers", true, "31512345678", "+31512345678"],
    ["can handle foreign numbers 2", true, "112345678", "+112345678"],
    ["can handle foreign numbers 3", true, "31512345678", "012345678"],
    [
      "returns false when the card number is undefined",
      false,
      "4912345678",
      undefined,
    ],
    ["returns false when the card number is null", false, "num1", null],
  ])("%s", (_, expectedValue, whatsAppNumber, cardNumber) => {
    expect(comparePhoneNumbers(whatsAppNumber, cardNumber)).toBe(expectedValue);
  });
});

// to match profiles they at least need a jid
// the part before the @ is equivalent to the phone number
// because the whatsapp profiles are in my contacts there will always be a
// contact that matches them
describe("matchWhatsAppProfilesWithVCards", () => {
  const numberToVCard = (phoneNumber) =>
    new vCard().parse(`BEGIN:VCARD\r
VERSION:3.0\r
FN:Single Number\r
N:Number;Single;;;\r
TEL;TYPE=CELL:${phoneNumber}\r
END:VCARD\r
`);

  const expected = [
    {
      profile: { jid: "491234567890@something.com" },
      card: numberToVCard("+491234567890"),
    },
    {
      profile: { jid: "491234567891@something.com" },
      card: numberToVCard("+491234567891"),
    },
    {
      profile: { jid: "491234567892@something.com" },
      card: numberToVCard("01234567892"),
    },
    {
      profile: { jid: "411234567893@something.com" },
      card: numberToVCard("00411234567893"),
    },
  ];

  const whatsAppProfiles = expected.map((matches) => matches.profile);
  const vCards = expected.map((matches) => matches.card);

  it("matches the whatsapp profile to a vcard", () => {
    expect(matchWhatsAppProfilesWithVCards(whatsAppProfiles, vCards)).toEqual(
      expected
    );
  });
});
