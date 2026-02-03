-- Grant managers permission to manage teachers (insert, update, delete)
CREATE POLICY "Managers can insert teachers" 
ON public.teachers 
FOR INSERT 
WITH CHECK ((school_id = get_user_school_id(auth.uid())) AND has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can update teachers" 
ON public.teachers 
FOR UPDATE 
USING ((school_id = get_user_school_id(auth.uid())) AND has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can delete teachers" 
ON public.teachers 
FOR DELETE 
USING ((school_id = get_user_school_id(auth.uid())) AND has_role(auth.uid(), 'manager'::app_role));