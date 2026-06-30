'use client'
import Navbar from "../components/ui/navbar";
import Purchase from "./purchaseCard";
import { Card, CardAction, CardTitle } from "@/components/ui/card";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { Cog, Swords, Wrench, Volleyball, Handshake, StickyNotePlus, Plus } from "lucide-react"
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from "recharts";
import Item from "./itemCard";

export default function Home() {

  const data = [
    { name: "Spent", value: 1159.9},
    { name: "Remains", value: 2840.07},
  ];
  const COLORS = ["#e7000b", "#00bc7d"];

  return (
    <div className="bg-background min-h-screen">
      <Navbar userName="Example User" userRole="president" userPicture=""></Navbar>
      <Card className="m-3 mt-4 p-2 bg-mist-700 h-fit gap-0">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="font-jetbrians text-sm text-zinc-100 mb-1">Filter by Catagory:</h1>
            <ToggleGroup multiple defaultValue={['Robot', "Competition", "Tools", "Field", "Outreach"]}>
              <ToggleGroupItem value="Robot" className="border-yellow-500 text-yellow-500 border-3 text-base font-bold hover:bg-yellow-400 hover:text-black group aria-pressed:bg-yellow-500 aria-pressed:text-black"><Cog className="size-4 text-yellow-500 group-hover:text-black group-aria-pressed:text-black" /> Robot</ToggleGroupItem>
              <ToggleGroupItem value="Competition" className="border-emerald-500 text-emerald-500 border-3 text-base font-bold hover:bg-emerald-400 hover:text-black group aria-pressed:bg-emerald-500 aria-pressed:text-black"><Swords className="size-4 text-emerald-500 group-hover:text-black group-aria-pressed:text-black" /> Competition</ToggleGroupItem>
              <ToggleGroupItem value="Tools" className="border-rose-500 text-rose-500 border-3 text-base font-bold hover:bg-rose-400 hover:text-black group aria-pressed:bg-rose-500 aria-pressed:text-black"><Wrench className="size-4 text-rose-500 group-hover:text-black group-aria-pressed:text-black" /> Tools</ToggleGroupItem>
              <ToggleGroupItem value="Field" className="border-lime-500 text-lime-500 border-3 text-base font-bold hover:bg-lime-400 hover:text-black group aria-pressed:bg-lime-500 aria-pressed:text-black"><Volleyball className="size-4 text-lime-500 group-hover:text-black group-aria-pressed:text-black" /> Field</ToggleGroupItem>
              <ToggleGroupItem value="Outreach" className="border-cyan-500 text-cyan-500 border-3 text-base font-bold hover:bg-cyan-400 hover:text-black group aria-pressed:bg-cyan-500 aria-pressed:text-black"><Handshake className="size-4 text-cyan-500 group-hover:text-black group-aria-pressed:text-black" /> Outreach</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="ml-auto">
            <Dialog>
              <DialogTrigger render={<Button className="text-lg w-fit p-3"><StickyNotePlus className="mr-1" />New Request</Button>}></DialogTrigger>
              <DialogContent className="bg-red-900 w-fit max-w-fit sm:max-w-fit">
                <h1 className="text-2xl text-zinc-100 font-bold">New Purchase</h1>
                <div className="flex gap-2 items-stretch">
                  <Card className="w-sm gap-0 bg-mist-600 text-zinc-100">
                    <CardTitle className="ml-2 text-lg font-jetbrains font-bold text-zinc-100">Budget</CardTitle>
                    <div className="p-2 w-full">
                      <h1 className="text-5xl font-bold text-emerald-400 mt-4">$2,840.07</h1>
                      <h2 className="text-lg mt-2">Remains in Robot (71%)</h2>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            isAnimationActive={true}
                          >
                            {data.map((entry, index) => (
                              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                  <div>
                    <Card className="w-lg gap-0 bg-mist-600 text-zinc-100">
                      <CardTitle className="ml-2 text-lg font-jetbrains font-bold text-zinc-100">Info</CardTitle>
                      <div className="p-2 w-full">
                        <Field>
                          <FieldLabel>Request Name: <span className="text-destructive">*</span></FieldLabel>
                          <Input id="name" autoComplete="off" placeholder="ex: CTRE Restock" className="w-full" />
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                          <Field className="w-full">
                            <FieldLabel className="mt-2">Catagory <span className="text-destructive">*</span></FieldLabel>
                            <Select>
                              <SelectTrigger className="w-full">
                                <SelectValue className="text-zinc-100" placeholder="Select a category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Roobt">Roobt</SelectItem>
                                <SelectItem value="Competition">Competition</SelectItem>
                                <SelectItem value="Tools">Tools</SelectItem>
                                <SelectItem value="Field">Field</SelectItem>
                                <SelectItem value="Outreach">Outreach</SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field className="w-full">
                            <FieldLabel className="mt-3">Group</FieldLabel>
                            <Select>
                              <SelectTrigger className="w-full">
                                <SelectValue className="text-zinc-100" placeholder="Select a group" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Test Group">Test Group</SelectItem>
                                <SelectItem value="Custom Group"><Input id="name" autoComplete="off" placeholder="New Group" className="w-full p-1" /></SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>
                        </div>
                      </div>
                    </Card>
                    <Card className="w-lg gap-0 bg-mist-600 text-zinc-100 mt-2 pb-0">
                      <CardTitle className="ml-2 text-lg font-jetbrains font-bold text-zinc-100">Add Item</CardTitle>
                      <div className="p-2 w-full">
                        <Field>
                          <FieldLabel>Item Name: <span className="text-destructive">*</span></FieldLabel>
                          <Input id="name" autoComplete="off" placeholder="ex: CANivore" className="w-full" />
                        </Field>
                        <Field className="mt-2">
                          <FieldLabel>Item Link:</FieldLabel>
                          <Input id="name" autoComplete="off" placeholder="https://example.com" className="w-full" />
                        </Field>
                        <div className="flex gap-5 mt-2">
                          <Field className="w-full">
                            <FieldLabel>Quanity <span className="text-destructive">*</span></FieldLabel>
                            <Input id="name" autoComplete="off" placeholder="ex: CANivore" className="w-full" />
                          </Field>
                          <Field className="w-full">
                            <FieldLabel>Cost Per<span className="text-destructive">*</span></FieldLabel>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-white">$</span>
                              <Input id="cost" autoComplete="off" className="w-full pl-7" />
                            </div>
                          </Field>
                        </div>
                        <Button className="bg-emerald-600 mt-4 text-sm hover:bg-emerald-700"><Plus />Add Item</Button>
                      </div>
                    </Card>
                  </div>
                  <div className="flex flex-col gap-2 h-full">
                    <Card className="w-md gap-0 bg-mist-600 text-zinc-100 flex-1 flex flex-col min-h-0">
                      <CardTitle className="ml-2 text-lg font-jetbrains font-bold text-zinc-100">Items</CardTitle>
                      <div className="p-2 w-full flex-1 overflow-auto min-h-0">
                        <Item name="CANivore" cost={299.99} quanity={2} link="ctre.com" />
                        <Item name="Pigeon 2.0" cost={199.99} quanity={1} link="ctre.com" />
                        <Item name="CANcoder" cost={89.99} quanity={4} link="ctre.com" />
                      </div>
                    </Card>
                    <Card className="w-md gap-0 bg-mist-600 text-zinc-100 p-2 flex-none">
                      <h2>Order Total:</h2>
                      <div className="flex">
                      <h1 className="text-2xl text-emerald-400 font-bold">$1,159.93</h1>
                      <Button className="w-fit text-base bg-zinc-100 text-black border-0 ml-auto hover:bg-zinc-300">Submit</Button>
                      </div>
                    </Card>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </Card>
      <Purchase itemName="Season Registration" cost={6500} requestor="Example User" catagory="Competition" requestedDate="2026-06-10" status="needsAproval" />
      <Purchase itemName="CTRE Restock" cost={1258} requestor="Example User" catagory="Robot" requestedDate="2026-06-12" status="aproved" />
      <Purchase itemName="Molex Crimping Tool" cost={499} requestor="Example User" catagory="Tools" requestedDate="2026-06-12" status="purchased" />
      <Purchase itemName="BIOCORE Scoring Elements" cost={169} requestor="Example User" catagory="Field" requestedDate="2026-06-12" status="recived" />
      <Purchase itemName="Outreach Barrier Spray Paint" cost={50} requestor="Example User" catagory="Outreach" requestedDate="2026-06-12" status="rejected" />
    </div>
  );
}
